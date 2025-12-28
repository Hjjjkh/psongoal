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
    const { name, category, start_date, end_date, editedActions, phases } = body

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
    if (!['health', 'learning', 'project', 'custom'].includes(category)) {
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

    // 三、确定使用多阶段还是单阶段（向后兼容）
    let phasesToCreate: Array<{
      name: string
      description: string | null
      actions: Array<{
        titleTemplate: string
        definition: string
        estimatedTime: number | null
        count: number
      }>
    }> = []

    if (phases && Array.isArray(phases) && phases.length > 0) {
      // 多阶段模式：使用传入的 phases
      phasesToCreate = phases.map((phase: any) => ({
        name: phase.name || '',
        description: phase.description || null,
        actions: (phase.actions || []).map((action: any) => ({
          titleTemplate: action.titleTemplate || '',
          definition: action.definition || '',
          estimatedTime: action.estimatedTime !== undefined ? action.estimatedTime : null,
          count: action.count && typeof action.count === 'number' && action.count >= 1 && action.count <= 100
            ? action.count
            : 7,
        })),
      }))
    } else {
      // 向后兼容：单阶段模式（使用内置模板）
      const template = getTemplate(category as TemplateCategory)
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      // 确保 template.phase 存在（向后兼容）
      if (!template.phase && template.phases && template.phases.length > 0) {
        template.phase = template.phases[0]
      }
      if (!template.phase) {
        return NextResponse.json(
          { error: 'Template phase not found' },
          { status: 404 }
        )
      }

      // 使用编辑后的行动数据（如果提供），否则使用模板默认数据
      // 此时 template.phase 已经确保存在（上面的检查）
      const phase = template.phase!
      const actionsToUse = editedActions && Array.isArray(editedActions) && editedActions.length === phase.exampleActions.length
        ? editedActions.map((edited, idx) => {
            // 解析每个行动模板的生成数量
            const parsedCount = edited.count && typeof edited.count === 'number' && edited.count >= 1 && edited.count <= 100
              ? edited.count
              : 7
            
            return {
              titleTemplate: edited.titleTemplate || phase.exampleActions[idx].titleTemplate,
              definition: edited.definition || phase.exampleActions[idx].definition,
              estimatedTime: edited.estimatedTime !== undefined ? edited.estimatedTime : phase.exampleActions[idx].estimatedTime,
              count: parsedCount, // 每个行动模板的生成数量
            }
          })
        : phase.exampleActions.map(action => ({
            ...action,
            count: 7, // 默认数量
          }))

      phasesToCreate = [{
        name: phase.name,
        description: phase.description,
        actions: actionsToUse,
      }]
    }

    // 验证阶段数据
    if (phasesToCreate.length === 0) {
      return NextResponse.json(
        { error: 'At least one phase is required' },
        { status: 400 }
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

    // 五、创建多个阶段和行动
    const allInsertedPhases = []
    const allInsertedActions = []

    // 获取用户信息用于占位符替换
    const userName = user.user_metadata?.name || 
                     user.user_metadata?.full_name || 
                     user.email?.split('@')[0] || 
                     '用户'
    const baseDate = new Date(start_date) // 使用目标开始日期作为基准

    // 分批插入，防止数据库压力（每次最多 50 条）
    const BATCH_SIZE = 50

    // 遍历每个阶段
    for (let phaseIndex = 0; phaseIndex < phasesToCreate.length; phaseIndex++) {
      const phaseData = phasesToCreate[phaseIndex]

      // 创建阶段
      const { data: phase, error: phaseError } = await supabase
        .from('phases')
        .insert({
          goal_id: goal.id,
          name: phaseData.name,
          description: phaseData.description,
          order_index: phaseIndex + 1,
        })
        .select()
        .single()

      if (phaseError) {
        console.error('Error creating phase:', phaseError)
        // 回滚 - 删除已创建的所有数据
        try {
          // 删除已插入的 Actions
          if (allInsertedActions.length > 0) {
            const insertedIds = allInsertedActions.map(a => a.id)
            await supabase.from('actions').delete().in('id', insertedIds)
          }
          // 删除已插入的 Phases
          if (allInsertedPhases.length > 0) {
            const phaseIds = allInsertedPhases.map(p => p.id)
            await supabase.from('phases').delete().in('id', phaseIds)
          }
          // 删除 Goal
          await supabase.from('goals').delete().eq('id', goal.id).eq('user_id', user.id)
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError)
        }
        return NextResponse.json(
          { error: 'Failed to create phase' },
          { status: 500 }
        )
      }

      allInsertedPhases.push(phase)

      // 为每个阶段的行动创建批量行动
      const allActions = []
      let currentOrderIndex = 1

      for (const exampleAction of phaseData.actions) {
        // 每个行动模板使用自己的生成数量
        const count = exampleAction.count || 7
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
              // 删除已插入的 Phases
              if (allInsertedPhases.length > 0) {
                const phaseIds = allInsertedPhases.map(p => p.id)
                await supabase.from('phases').delete().in('id', phaseIds)
              }
              // 删除 Goal
              await supabase.from('goals').delete().eq('id', goal.id).eq('user_id', user.id)
            } catch (rollbackError) {
              console.error('Error during rollback:', rollbackError)
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
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        goal,
        phases: allInsertedPhases,
        actions: allInsertedActions,
        actionCount: allInsertedActions.length,
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

