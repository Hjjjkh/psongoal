/**
 * 行动完成接口
 * 
 * 约束规则（仅用于当前目标执行应用）：
 * 1. 这是应用级的裁决接口，前端状态不可信
 * 2. completed_at 是推进的唯一真相源
 * 3. 行动只能完成一次，已完成的行动永远不可再次完成（包括并发、重复请求）
 * 4. 是否允许完成、是否推进，全部由后端裁决
 * 5. 返回清晰、可区分的 HTTP 状态码（不是一律 500）
 * 
 * 为什么 API 层要再次校验 completed_at：
 * - 这是 API 的裁决边界，而不是重复代码
 * - 即使 completeActionAndAdvance 内部也做了校验，这一步仍然必须存在
 * - 前端不能依赖按钮禁用或 execution 状态，所有判断必须在后端完成
 * 
 * 为什么使用 409 Conflict：
 * - 409 Conflict 表示请求与当前资源状态冲突
 * - 行动已完成是一种状态冲突，不是错误
 * - 区分"应用拒绝"（409）和"系统错误"（500）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { completeActionAndAdvance } from '@/lib/system-state'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { actionId, difficulty, energy } = body

    // 一、严格类型校验（不能错误拒绝 0）
    if (
      !actionId ||
      typeof difficulty !== 'number' ||
      typeof energy !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    // 二、完成态短路校验（核心裁决边界）
    // 在调用 completeActionAndAdvance 之前，必须显式查询 actions.completed_at
    // 这是 API 的裁决边界，确保已完成 Action 永远不可再次完成
    const { data: action, error: actionError } = await supabase
      .from('actions')
      .select('completed_at')
      .eq('id', actionId)
      .single()

    if (actionError || !action) {
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      )
    }

    // 【核心约束】如果 Action 已经有 completed_at，直接返回 409 Conflict
    // 不允许进入推进逻辑，即使 completeActionAndAdvance 内部也有校验
    if (action.completed_at) {
      return NextResponse.json(
        { error: 'Action already completed' },
        { status: 409 }
      )
    }

    // 【每日唯一行动约束】检查今天是否已经完成过其他行动
    const today = new Date().toISOString().split('T')[0]
    const { data: todayExecutions } = await supabase
      .from('daily_executions')
      .select('action_id')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('completed', true)

    // 如果今天已经完成过其他行动（不是当前这个行动），拒绝完成
    if (todayExecutions && todayExecutions.length > 0) {
      const hasOtherCompletedToday = todayExecutions.some(e => e.action_id !== actionId)
      if (hasOtherCompletedToday) {
        return NextResponse.json(
          { error: '今日已完成行动，每天只能完成一个行动' },
          { status: 409 }
        )
      }
    }

    // 三、调用推进逻辑（保持原有实现）
    const result = await completeActionAndAdvance(
      user.id,
      actionId,
      difficulty,
      energy
    )

    // 四、区分「系统拒绝」与「系统错误」
    // result.success === false 表示系统拒绝（可能是并发请求导致）
    // 只有真正异常才返回 500
    if (!result.success) {
      return NextResponse.json(
        { error: 'System rejected completion' },
        { status: 409 }
      )
    }

    // 五、成功响应语义（保持冷静，不添加情绪或解释）
    // 这是系统裁决层，不是用户提示层
    return NextResponse.json({
      success: true,
      nextActionId: result.nextActionId
    })
  } catch (error) {
    // 只有真正异常才返回 500
    console.error('Error in complete-action API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
