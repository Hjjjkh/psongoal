/**
 * 强裁决型 Phase 创建接口
 * 
 * 设计原则：
 * 1. Phase 创建受系统裁决控制，不是简单的 CRUD 操作
 * 2. 如果系统中存在"当前 Goal 正在进行中"，拒绝创建 Phase
 * 3. completed_at is the single source of truth for advancement.
 * 4. Frontend state is not trusted. All decisions happen on the server.
 * 5. 所有推进状态判断由后端完成，前端无需依赖状态或按钮禁用
 * 
 * 为什么要校验当前 Goal：
 * - 系统设计为"每日唯一行动"，同时只能有一个 Goal 在执行
 * - 如果当前 Goal 未完成（status != 'completed'），系统不允许创建新 Phase
 * - 这是系统级的约束，确保用户专注于当前目标，避免在目标进行中修改规划
 * 
 * 为什么使用 409 Conflict：
 * - 409 Conflict 表示请求与当前资源状态冲突
 * - 当前 Goal 正在进行中是一种状态冲突，不是错误
 * - 区分"系统拒绝"（409）和"系统错误"（500）
 * 
 * 为什么前端不能依赖按钮状态：
 * - 前端状态可能不同步，所有判断必须在后端完成
 * - 并发请求可能导致状态变化，后端必须做最终裁决
 * - 即使前端按钮被禁用，API 层也必须进行裁决校验
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
    const { goal_id, name, description } = body

    // 一、严格参数校验
    // goal_id、name 必须是非空字符串
    // description 可选，如果存在必须是字符串
    if (
      !goal_id ||
      typeof goal_id !== 'string' ||
      !name ||
      typeof name !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    // description 如果存在，必须是字符串
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return NextResponse.json(
          { error: 'Invalid parameters' },
          { status: 400 }
        )
      }
    }

    // 二、系统裁决逻辑：检查当前 Goal 是否正在进行中
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
        // 【核心约束】如果当前 Goal 未完成（status != 'completed'），拒绝创建 Phase
        // 所有推进状态判断由后端完成，前端无需依赖状态或按钮禁用
        if (currentGoal.status !== 'completed') {
          return NextResponse.json(
            { error: 'Cannot create phase while goal is in progress' },
            { status: 409 }
          )
        }
      }
    }

    // 三、数据库插入
    // 获取当前 goal 的最大 order_index
    const { data: existingPhases } = await supabase
      .from('phases')
      .select('order_index')
      .eq('goal_id', goal_id)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrderIndex = existingPhases && existingPhases.length > 0
      ? existingPhases[0].order_index + 1
      : 1

    const { data, error } = await supabase
      .from('phases')
      .insert({
        goal_id,
        name,
        description: description || null,
        order_index: nextOrderIndex,
      })
      .select()
      .single()

    if (error) {
      // 系统裁决冲突或数据库唯一约束冲突 → 返回 409 Conflict
      if (error.code === '23505' || error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Cannot create phase while goal is in progress' },
          { status: 409 }
        )
      }
      
      // 真正异常 → 返回 500 Internal Server Error
      console.error('Error creating phase:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    // 四、成功响应
    return NextResponse.json({ success: true, data })
  } catch (error) {
    // 只有真正异常才返回 500
    console.error('Error in phases API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

