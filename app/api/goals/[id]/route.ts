/**
 * DEV ONLY: 删除 Goal（测试级删除）
 * 仅用于开发环境，真删除，不做软删除
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemState, updateSystemState } from '@/lib/system-state'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: goalId } = await params

    if (!goalId) {
      return NextResponse.json({ error: 'Invalid goal ID' }, { status: 400 })
    }

    // 验证 goal 是否属于当前用户
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, user_id')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }

    // 检查是否是当前目标，如果是，需要清理系统状态
    const systemState = await getSystemState(user.id)
    if (systemState?.current_goal_id === goalId) {
      // 清理系统状态
      await updateSystemState(user.id, {
        current_goal_id: null,
        current_phase_id: null,
        current_action_id: null,
      })
    }

    // 真删除（CASCADE 会自动删除关联的 phases 和 actions）
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)

    if (error) {
      console.error('Error deleting goal:', error)
      return NextResponse.json(
        { error: 'Failed to delete goal' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete goal API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

