/**
 * 更新目标状态（暂停/恢复）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: goalId } = await params
    const body = await request.json()
    const { status } = body

    if (!goalId) {
      return NextResponse.json({ error: 'Invalid goal ID' }, { status: 400 })
    }

    if (!status || !['active', 'paused', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // 验证 goal 是否属于当前用户
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, user_id, status')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }

    // 如果目标已完成，不允许修改状态
    if (goal.status === 'completed' && status !== 'completed') {
      return NextResponse.json(
        { error: '已完成的目标不能修改状态' },
        { status: 400 }
      )
    }

    // 更新状态
    const { data: updatedGoal, error: updateError } = await supabase
      .from('goals')
      .update({ status })
      .eq('id', goalId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating goal status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update goal status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: updatedGoal })
  } catch (error) {
    console.error('Error in update goal status API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

