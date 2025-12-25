import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSystemState, initSystemState } from '@/lib/system-state'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { goal_id } = body

    if (!goal_id) {
      return NextResponse.json(
        { error: 'Missing goal_id' },
        { status: 400 }
      )
    }

    // 初始化系统状态（如果不存在）
    await initSystemState(user.id)

    // 获取该 goal 的第一个 phase 的第一个 action
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
      return NextResponse.json(
        { error: 'Failed to update system state' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in set-current-goal API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

