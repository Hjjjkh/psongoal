/**
 * 行动创建接口
 * 
 * 约束规则（仅用于当前目标执行应用）：
 * 1. 这是应用级的裁决接口，前端状态不可信
 * 2. 严格参数校验，确保所有必需字段类型正确
 * 3. 检查 completed_at 参数（创建时不应有此参数）
 * 4. 返回一致的 400 / 409 / 500 状态码
 * 5. 保证与 complete-action、mark-incomplete 保持一致的处理风格
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemState } from '@/lib/system-state'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { phase_id, title, definition, estimated_time } = body

    // 一、严格类型校验
    if (
      !phase_id ||
      typeof phase_id !== 'string' ||
      !title ||
      typeof title !== 'string' ||
      !definition ||
      typeof definition !== 'string'
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
    // 如果当前目标正在进行中，不允许创建新行动
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
        // 【核心约束】如果当前 Goal 未完成（status != 'completed'），拒绝创建 Action
        if (currentGoal.status !== 'completed') {
          return NextResponse.json(
            { error: '当前目标正在进行中，无法创建新行动，请先完成或放弃当前目标' },
            { status: 409 }
          )
        }
      }
    }

    // 四、检查 completed_at 参数（创建时不应有此参数）
    if (body.completed_at !== undefined && body.completed_at !== null) {
      return NextResponse.json(
        { error: 'Cannot create action with completed_at' },
        { status: 409 }
      )
    }

    // 五、获取当前 phase 的最大 order_index
    const { data: existingActions } = await supabase
      .from('actions')
      .select('order_index')
      .eq('phase_id', phase_id)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrderIndex = existingActions && existingActions.length > 0
      ? existingActions[0].order_index + 1
      : 1

    // 六、创建 Action（completed_at 默认为 null，这是创建接口，不应有 completed_at）
    const { data, error } = await supabase
      .from('actions')
      .insert({
        phase_id,
        title,
        definition,
        estimated_time: estimated_time || null,
        order_index: nextOrderIndex,
        completed_at: null, // 显式设置为 null，确保新创建的 Action 未完成
      })
      .select()
      .single()

    if (error) {
      // 检查是否是唯一性约束或其他数据库错误
      if (error.code === '23505') {
        // PostgreSQL unique constraint violation
        return NextResponse.json(
          { error: 'Action already exists' },
          { status: 409 }
        )
      }
      console.error('Error creating action:', error)
      return NextResponse.json(
        { error: 'Failed to create action' },
        { status: 500 }
      )
    }

    // 五、成功响应（保持简洁，不添加任何情绪、解释或提示信息）
    return NextResponse.json({ success: true, data })
  } catch (error) {
    // 只有真正异常才返回 500
    console.error('Error in actions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

