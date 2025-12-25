/**
 * 强裁决型 Goal 创建接口
 * 
 * 设计原则：
 * 1. Goal 创建受系统裁决控制，不是简单的 CRUD 操作
 * 2. 如果系统中存在"当前 Goal 正在进行中"，拒绝创建新 Goal
 * 3. completed_at is the single source of truth for advancement.
 * 4. Frontend state is not trusted. All decisions happen on the server.
 * 5. 所有推进状态判断由后端完成，前端无需依赖状态
 * 
 * 为什么要校验当前 Goal：
 * - 系统设计为"每日唯一行动"，同时只能有一个 Goal 在执行
 * - 如果当前 Goal 未完成（status != 'completed'），系统不允许创建新 Goal
 * - 这是系统级的约束，确保用户专注于当前目标
 * 
 * 为什么使用 409 Conflict：
 * - 409 Conflict 表示请求与当前资源状态冲突
 * - 当前 Goal 正在进行中是一种状态冲突，不是错误
 * - 区分"系统拒绝"（409）和"系统错误"（500）
 * 
 * 为什么前端不能依赖按钮状态：
 * - 前端状态可能不同步，所有判断必须在后端完成
 * - 并发请求可能导致状态变化，后端必须做最终裁决
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
    const { name, category, start_date, end_date } = body

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

    // 校验日期格式（简单校验，确保是有效日期字符串）
    const startDate = new Date(start_date)
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    // 校验 end_date（如果提供）
    if (end_date) {
      if (typeof end_date !== 'string') {
        return NextResponse.json(
          { error: 'Invalid parameters' },
          { status: 400 }
        )
      }
      const endDate = new Date(end_date)
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid parameters' },
          { status: 400 }
        )
      }
      // 校验结束日期不能早于开始日期
      if (endDate < startDate) {
        return NextResponse.json(
          { error: 'Invalid parameters' },
          { status: 400 }
        )
      }
    }

    // 二、系统裁决逻辑：检查当前 Goal 是否正在进行中
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
        // 【核心约束】如果当前 Goal 未完成（status != 'completed'），拒绝创建新 Goal
        if (currentGoal.status !== 'completed') {
          return NextResponse.json(
            { error: 'Cannot create new goal while current goal is in progress' },
            { status: 409 }
          )
        }
      }
    }

    // 三、数据库插入
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        name,
        category,
        start_date,
        end_date: end_date || null,
      })
      .select()
      .single()

    if (error) {
      // 数据库唯一约束冲突或系统拒绝 → 返回 409 Conflict
      if (error.code === '23505' || error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Cannot create new goal while current goal is in progress' },
          { status: 409 }
        )
      }
      
      // 真正异常 → 返回 500
      console.error('Error creating goal:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    // 四、成功响应
    return NextResponse.json({ success: true, data })
  } catch (error) {
    // 只有真正异常才返回 500
    console.error('Error in goals API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
