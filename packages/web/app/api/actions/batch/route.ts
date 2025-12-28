/**
 * 批量创建行动接口
 * 仅用于目标执行应用，一次操作生成完整执行序列
 * 场景：健身 Day 1-30、学习第 1-20 课、项目阶段性拆解
 * 
 * 约束规则：
 * 1. 严格参数校验
 * 2. 验证阶段所有权
 * 3. 批量插入，保证原子性
 * 4. 自动计算 order_index
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemState } from '@/lib/system-state'
import { replacePlaceholders } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      phase_id, 
      title_template,  // 模板字符串，如 "核心训练 Day {n}"
      definition,       // 完成标准（所有 Action 共用）
      count,            // 数量 N
      estimated_time    // 预计时间（可选，所有 Action 共用）
    } = body

    // 一、严格类型校验
    if (
      !phase_id ||
      typeof phase_id !== 'string' ||
      !title_template ||
      typeof title_template !== 'string' ||
      !definition ||
      typeof definition !== 'string' ||
      !count ||
      typeof count !== 'number' ||
      count < 1 ||
      count > 1000  // 防止过大批量
    ) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    // estimated_time 是可选的，但如果提供必须是数字
    if (estimated_time !== undefined && estimated_time !== null) {
      if (typeof estimated_time !== 'number' || estimated_time < 0) {
        return NextResponse.json(
          { error: 'Invalid estimated_time' },
          { status: 400 }
        )
      }
    }

    // 二、验证 phase 是否存在且属于当前用户
    const { data: phase, error: phaseError } = await supabase
      .from('phases')
      .select('id, goal_id')
      .eq('id', phase_id)
      .single()

    if (phaseError || !phase) {
      return NextResponse.json(
        { error: 'Phase not found' },
        { status: 404 }
      )
    }

    // 验证 phase 所属的 goal 是否属于当前用户
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, user_id')
      .eq('id', phase.goal_id)
      .eq('user_id', user.id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 三、系统裁决逻辑：检查当前 Goal 是否正在进行中
    // 如果当前目标正在进行中，不允许批量创建新行动
    const systemState = await getSystemState(user.id)
    
    if (systemState?.current_goal_id) {
      // 查询当前 Goal 的状态
      const { data: currentGoal, error: currentGoalError } = await supabase
        .from('goals')
        .select('status')
        .eq('id', systemState.current_goal_id)
        .eq('user_id', user.id)
        .single()

      if (!currentGoalError && currentGoal) {
        // 【核心约束】如果当前 Goal 未完成（status != 'completed'），拒绝批量创建 Action
        if (currentGoal.status !== 'completed') {
          return NextResponse.json(
            { error: '当前目标正在进行中，无法批量创建新行动，请先完成或放弃当前目标' },
            { status: 409 }
          )
        }
      }
    }

    // 四、获取当前 phase 的最大 order_index
    const { data: existingActions } = await supabase
      .from('actions')
      .select('order_index')
      .eq('phase_id', phase_id)
      .order('order_index', { ascending: false })
      .limit(1)

    const startOrderIndex = existingActions && existingActions.length > 0
      ? existingActions[0].order_index + 1
      : 1

    // 五、生成批量 Actions 数据
    // 获取用户信息用于占位符替换
    // 从 user metadata 或 email 获取用户名
    const userName = user.user_metadata?.name || 
                     user.user_metadata?.full_name || 
                     user.email?.split('@')[0] || 
                     '用户'
    
    const baseDate = new Date() // 使用当前日期作为基准
    
    // 六、分批插入 Actions（大量数据时分批处理）
    const BATCH_SIZE = 50 // 每批最多 50 条
    const allInsertedActions = []
    
    // 对于大量数据，分批处理
    for (let batchStart = 1; batchStart <= count; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, count)
      const batchActions = []
      
      for (let i = batchStart; i <= batchEnd; i++) {
        // 使用增强的占位符替换函数
        // 支持 {n}, {date}, {date+N}, {week}, {userName}, {year}, {month}, {day}
        const title = replacePlaceholders(title_template, i, userName, baseDate)
        
        // 对 definition 也支持占位符替换
        const processedDefinition = replacePlaceholders(definition, i, userName, baseDate)
        
        batchActions.push({
          phase_id,
          title,
          definition: processedDefinition,
          estimated_time: estimated_time || null,
          order_index: startOrderIndex + i - 1,
          completed_at: null,
        })
      }
      
      // 插入当前批次
      const { data: batchData, error: batchError } = await supabase
        .from('actions')
        .insert(batchActions)
        .select()
      
      if (batchError) {
        // 检查是否是唯一性约束或其他数据库错误
        if (batchError.code === '23505') {
          return NextResponse.json(
            { error: 'Some actions already exist' },
            { status: 409 }
          )
        }
        console.error(`Error creating batch actions (${batchStart}-${batchEnd}):`, batchError)
        return NextResponse.json(
          { error: 'Failed to create actions' },
          { status: 500 }
        )
      }
      
      if (batchData) {
        allInsertedActions.push(...batchData)
      }
    }

    // 七、成功响应
    return NextResponse.json({ 
      success: true, 
      data: { 
        count: allInsertedActions.length,
        actions: allInsertedActions 
      } 
    })
  } catch (error) {
    console.error('Error in batch actions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

