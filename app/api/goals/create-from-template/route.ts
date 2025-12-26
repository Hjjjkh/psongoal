/**
 * 从模板创建目标接口
 * 仅用于目标创建功能，一次性创建目标 + 阶段 + 示例行动
 * 
 * 流程：
 * 1. 创建目标（需要执行状态裁决，检查当前目标状态）
 * 2. 创建阶段（基于模板）
 * 3. 为每个示例行动创建批量行动（默认 7 个，可配置）
 * 
 * 事务处理说明：
 * - Supabase PostgREST 不直接支持传统数据库事务
 * - 使用手动回滚逻辑：失败时删除已创建的数据
 * - 当前实现已确保数据一致性：任何步骤失败都会清理已创建的数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemState } from '@/lib/system-state'
import { getTemplate, type TemplateCategory } from '@/lib/templates'
import { replacePlaceholders } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, category, start_date, end_date, actionCount, editedActions } = body

    // 一、严格类型校验
    if (
      !name ||
      typeof name !== 'string' ||
      !category ||
      typeof category !== 'string' ||
      !start_date ||
      typeof start_date !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    // 校验 category 必须是有效值
    if (!['health', 'learning', 'project'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    // 校验日期格式
    const startDate = new Date(start_date)
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    // 校验 end_date（必填）
    if (!end_date || typeof end_date !== 'string') {
      return NextResponse.json(
        { error: '结束日期是必填项' },
        { status: 400 }
      )
    }
    const endDate = new Date(end_date)
    if (isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: '结束日期格式无效' },
        { status: 400 }
      )
    }
    if (endDate < startDate) {
      return NextResponse.json(
        { error: '结束日期不能早于开始日期' },
        { status: 400 }
      )
    }

    // actionCount 可选，默认 7，范围 1-100
    const count = actionCount && typeof actionCount === 'number' && actionCount >= 1 && actionCount <= 100
      ? actionCount
      : 7

    // 二、系统裁决逻辑：检查当前 Goal 是否正在进行中
    const systemState = await getSystemState(user.id)
    
    if (systemState?.current_goal_id) {
      const { data: currentGoal, error: goalError } = await supabase
        .from('goals')
        .select('status')
        .eq('id', systemState.current_goal_id)
        .eq('user_id', user.id)
        .single()

      if (!goalError && currentGoal) {
        if (currentGoal.status !== 'completed') {
          return NextResponse.json(
            { error: '当前目标正在进行中，请先完成或放弃当前目标后再创建新目标' },
            { status: 409 }
          )
        }
      }
    }

    // 三、获取模板
    const template = getTemplate(category as TemplateCategory)
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // 四、创建 Goal
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        name,
        category: category as TemplateCategory,
        start_date,
        end_date,
      })
      .select()
      .single()

    if (goalError) {
      if (goalError.code === '23505' || goalError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '当前目标正在进行中，请先完成或放弃当前目标后再创建新目标' },
          { status: 409 }
        )
      }
      console.error('Error creating goal:', goalError)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    // 五、创建 Phase（基于模板）
    const { data: phase, error: phaseError } = await supabase
      .from('phases')
      .insert({
        goal_id: goal.id,
        name: template.phase.name,
        description: template.phase.description,
        order_index: 1,
      })
      .select()
      .single()

    if (phaseError) {
      console.error('Error creating phase:', phaseError)
      // 回滚 - 删除已创建的 Goal
      try {
        await supabase.from('goals').delete().eq('id', goal.id).eq('user_id', user.id)
      } catch (rollbackError) {
        console.error('Error during rollback (goal):', rollbackError)
      }
      return NextResponse.json(
        { error: 'Failed to create phase' },
        { status: 500 }
      )
    }

    // 六、为每个示例行动创建批量行动
    // 使用编辑后的行动数据（如果提供），否则使用模板默认数据
    const actionsToUse = editedActions && Array.isArray(editedActions) && editedActions.length === template.phase.exampleActions.length
      ? editedActions.map((edited, idx) => ({
          titleTemplate: edited.titleTemplate || template.phase.exampleActions[idx].titleTemplate,
          definition: edited.definition || template.phase.exampleActions[idx].definition,
          estimatedTime: edited.estimatedTime !== undefined ? edited.estimatedTime : template.phase.exampleActions[idx].estimatedTime,
        }))
      : template.phase.exampleActions

    // 分批插入，防止数据库压力（每次最多 50 条）
    const BATCH_SIZE = 50
    const allActions = []
    let currentOrderIndex = 1

    // 获取用户信息用于占位符替换
    const userName = user.user_metadata?.name || 
                     user.user_metadata?.full_name || 
                     user.email?.split('@')[0] || 
                     '用户'
    const baseDate = new Date(start_date) // 使用目标开始日期作为基准

    for (const exampleAction of actionsToUse) {
      for (let i = 1; i <= count; i++) {
        // 使用增强的占位符替换函数
        const title = replacePlaceholders(exampleAction.titleTemplate, i, userName, baseDate)
        const definition = replacePlaceholders(exampleAction.definition, i, userName, baseDate)
        
        allActions.push({
          phase_id: phase.id,
          title,
          definition,
          estimated_time: exampleAction.estimatedTime,
          order_index: currentOrderIndex++,
          completed_at: null,
        })
      }
    }

    // 分批插入行动，确保大数据量时不会失败
    const allInsertedActions = []
    if (allActions.length > 0) {
      for (let i = 0; i < allActions.length; i += BATCH_SIZE) {
        const batch = allActions.slice(i, i + BATCH_SIZE)
        const { data: batchActions, error: batchError } = await supabase
          .from('actions')
          .insert(batch)
          .select()

        if (batchError) {
          console.error(`Error creating actions batch ${Math.floor(i / BATCH_SIZE) + 1}:`, batchError)
          // 回滚 - 删除已创建的所有数据
          try {
            // 删除已插入的 Actions
            if (allInsertedActions.length > 0) {
              const insertedIds = allInsertedActions.map(a => a.id)
              await supabase.from('actions').delete().in('id', insertedIds)
            }
            // 删除 Phase
            await supabase.from('phases').delete().eq('id', phase.id).eq('goal_id', goal.id)
            // 删除 Goal
            await supabase.from('goals').delete().eq('id', goal.id).eq('user_id', user.id)
          } catch (rollbackError) {
            console.error('Error during rollback:', rollbackError)
            // 即使回滚失败，也返回错误，让用户知道创建失败
          }
          return NextResponse.json(
            { error: 'Failed to create actions' },
            { status: 500 }
          )
        }

        if (batchActions) {
          allInsertedActions.push(...batchActions)
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          goal,
          phase,
          actions: allInsertedActions,
          actionCount: allInsertedActions.length,
        },
      })
    }

    // 如果没有示例 Actions，只返回 Goal 和 Phase
    return NextResponse.json({
      success: true,
      data: {
        goal,
        phase,
        actions: [],
        actionCount: 0,
      },
    })
  } catch (error) {
    console.error('Error in create-from-template API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

