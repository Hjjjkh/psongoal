/**
 * 目标创建接口
 * 
 * 约束规则（仅用于当前目标执行应用）：
 * 1. 目标创建受执行状态裁决控制，不是简单的 CRUD 操作
 * 2. 如果当前目标正在执行中，拒绝创建新目标
 * 3. completed_at 是推进的唯一真相源
 * 4. 前端状态不可信，所有判断由后端完成
 * 5. 所有推进状态判断由后端完成，前端无需依赖状态
 * 
 * 为什么要校验当前目标：
 * - 应用设计为"每日唯一行动"，同时只能有一个目标在执行
 * - 如果当前目标未完成（status != 'completed'），不允许创建新目标
 * - 这是应用级的约束，确保用户专注于当前目标
 * 
 * 为什么使用 409 Conflict：
 * - 409 Conflict 表示请求与当前资源状态冲突
 * - 当前目标正在进行中是一种状态冲突，不是错误
 * - 区分"应用拒绝"（409）和"系统错误"（500）
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
    if (!['health', 'learning', 'project', 'custom'].includes(category)) {
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
    // 校验结束日期不能早于开始日期
    if (endDate < startDate) {
      return NextResponse.json(
        { error: '结束日期不能早于开始日期' },
        { status: 400 }
      )
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
            { error: '当前目标正在进行中，请先完成或放弃当前目标后再创建新目标' },
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
        end_date,
      })
      .select()
      .single()

    if (error) {
      // 数据库唯一约束冲突或系统拒绝 → 返回 409 Conflict
      if (error.code === '23505' || error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '当前目标正在进行中，请先完成或放弃当前目标后再创建新目标' },
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
