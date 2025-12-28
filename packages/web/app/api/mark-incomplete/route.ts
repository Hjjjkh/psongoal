/**
 * 标记行动未完成接口
 * 
 * 约束规则（仅用于当前目标执行应用）：
 * 1. 这是应用级的裁决接口，前端状态不可信
 * 2. completed_at 是推进的唯一真相源
 * 3. 已完成的行动（completed_at IS NOT NULL）永远不可撤销
 * 4. 只有未完成的行动才允许记录未完成
 * 5. 所有判断逻辑在后端完成，前端不能绕过
 * 
 * 为什么 API 层要再次校验 completed_at：
 * - 这是 API 的裁决边界，确保已完成的行动永远不可撤销
 * - 即使 markActionIncomplete 内部也有校验，这一步仍然必须存在
 * - 前端不能依赖按钮状态或 execution 状态，所有判断必须在后端完成
 * 
 * 为什么使用 409 Conflict：
 * - 409 Conflict 表示请求与当前资源状态冲突
 * - 行动已完成是一种状态冲突，不是错误
 * - 区分"应用拒绝"（409）和"系统错误"（500）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { markActionIncomplete } from '@/lib/system-state'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { actionId } = body

    // 一、严格类型校验
    if (!actionId || typeof actionId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid actionId' },
        { status: 400 }
      )
    }

    // 二、完成态短路校验（核心裁决边界）
    // 在调用 markActionIncomplete 之前，必须显式查询 actions.completed_at
    // 这是 API 的裁决边界，确保已完成的 Action 永远不可撤销
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
    // 不允许进入后续逻辑，即使 markActionIncomplete 内部也有校验
    if (action.completed_at) {
      return NextResponse.json(
        { error: 'Cannot mark a completed action as incomplete' },
        { status: 409 }
      )
    }

    // 三、调用逻辑（保持原有实现）
    // 注意：markActionIncomplete 内部也应只允许未完成的 Action
    // 这里 API 层做裁决边界保障
    const success = await markActionIncomplete(user.id, actionId)

    // 四、区分「系统拒绝」与「系统错误」
    // success === false 表示系统拒绝（可能是并发请求导致）
    // 只有真正异常才返回 500
    if (!success) {
      return NextResponse.json(
        { error: 'System rejected action incomplete' },
        { status: 409 }
      )
    }

    // 五、成功响应（保持简洁，不添加任何情绪、解释或提示信息）
    return NextResponse.json({ success: true })
  } catch (error) {
    // 只有真正异常才返回 500
    console.error('Error in mark-incomplete API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
