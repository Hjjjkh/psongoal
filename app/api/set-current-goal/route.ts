/**
 * 强裁决型设置当前 Goal 接口
 * 
 * 设计原则：
 * 1. Goal 切换受系统裁决控制，不是简单的状态更新
 * 2. 如果系统中存在"当前 Goal 正在进行中"，拒绝切换 Goal
 * 3. completed_at is the single source of truth for advancement.
 * 4. Frontend state is not trusted. All decisions happen on the server.
 * 5. 所有推进状态判断由后端完成，前端无法绕过裁决逻辑
 * 
 * 为什么要校验当前 Goal：
 * - 系统设计为"每日唯一行动"，同时只能有一个 Goal 在执行
 * - 如果当前 Goal 未完成（status != 'completed'），系统不允许切换 Goal
 * - 这是系统级的约束，确保用户专注于当前目标，必须完成或放弃后才能切换
 * 
 * 为什么使用 409 Conflict：
 * - 409 Conflict 表示请求与当前资源状态冲突
 * - 当前 Goal 正在进行中是一种状态冲突，不是错误
 * - 区分"系统拒绝"（409）和"系统错误"（500）
 * 
 * 为什么前端不能绕过裁决：
 * - 前端状态可能不同步，所有判断必须在后端完成
 * - 并发请求可能导致状态变化，后端必须做最终裁决
 * - 即使前端按钮被禁用或隐藏，API 层也必须进行裁决校验
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSystemState, initSystemState, getSystemState } from '@/lib/system-state'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { goal_id } = body

    // 一、严格参数校验
    // goal_id 必须存在且为非空字符串
    if (!goal_id || typeof goal_id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid goal_id' },
        { status: 400 }
      )
    }

    // 二、系统裁决逻辑（核心）
    // 查询 system_states.current_goal_id 对应的 Goal
    const systemState = await getSystemState(user.id)
    
    if (systemState?.current_goal_id) {
      // 查询当前 Goal 的状态
      const { data: currentGoal, error: goalError } = await supabase
        .from('goals')
        .select('status')
        .eq('id', systemState.current_goal_id)
        .eq('user_id', user.id)
        .single()

      if (!goalError && currentGoal) {
        // 【核心约束】如果当前 Goal 未完成（status != 'completed'），拒绝切换 Goal
        // 后端裁决唯一可信，前端不能绕过
        if (currentGoal.status !== 'completed') {
          return NextResponse.json(
            { error: 'Cannot switch goal while current goal is in progress' },
            { status: 409 }
          )
        }
      }
    }

    // 三、业务逻辑
    // 初始化系统状态（如果不存在）
    await initSystemState(user.id)

    // 获取指定 Goal 的第一个 Phase
    const { data: firstPhase } = await supabase
      .from('phases')
      .select('id')
      .eq('goal_id', goal_id)
      .order('order_index', { ascending: true })
      .limit(1)
      .single()

    if (!firstPhase) {
      return NextResponse.json(
        { error: 'Goal has no phases' },
        { status: 400 }
      )
    }

    // 获取第一个 Phase 的第一个 Action
    const { data: firstAction } = await supabase
      .from('actions')
      .select('id')
      .eq('phase_id', firstPhase.id)
      .order('order_index', { ascending: true })
      .limit(1)
      .single()

    if (!firstAction) {
      return NextResponse.json(
        { error: 'Phase has no actions' },
        { status: 400 }
      )
    }

    // 更新系统状态
    const success = await updateSystemState(user.id, {
      current_goal_id: goal_id,
      current_phase_id: firstPhase.id,
      current_action_id: firstAction.id,
    })

    if (!success) {
      // 数据库异常 → 返回 500
      console.error('Error updating system state')
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    // 四、成功响应
    return NextResponse.json({ success: true })
  } catch (error) {
    // 只有真正异常才返回 500
    console.error('Error in set-current-goal API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

