/**
 * 删除 Phase
 * 真删除，级联删除关联的 actions
 * 如果删除的是当前阶段，会自动清理系统状态
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

    const { id: phaseId } = await params

    if (!phaseId) {
      return NextResponse.json({ error: 'Invalid phase ID' }, { status: 400 })
    }

    // 验证 phase 是否属于当前用户（通过 goal）
    const { data: phase, error: phaseError } = await supabase
      .from('phases')
      .select('id, goal_id')
      .eq('id', phaseId)
      .single()

    if (phaseError || !phase) {
      return NextResponse.json(
        { error: 'Phase not found' },
        { status: 404 }
      )
    }

    // 验证 goal 是否属于当前用户
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

    // 检查是否是当前阶段，如果是，需要清理系统状态
    const systemState = await getSystemState(user.id)
    if (systemState?.current_phase_id === phaseId) {
      // 清理系统状态（阶段和行动）
      await updateSystemState(user.id, {
        current_phase_id: null,
        current_action_id: null,
      })
    }

    // 真删除（CASCADE 会自动删除关联的 actions）
    const { error } = await supabase
      .from('phases')
      .delete()
      .eq('id', phaseId)

    if (error) {
      console.error('Error deleting phase:', error)
      return NextResponse.json(
        { error: 'Failed to delete phase' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete phase API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

