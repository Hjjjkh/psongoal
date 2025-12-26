/**
 * DEV ONLY: 删除 Action（测试级删除）
 * 仅用于开发环境，真删除，不做软删除
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemState, updateSystemState } from '@/lib/system-state'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const actionId = params.id

    if (!actionId) {
      return NextResponse.json({ error: 'Invalid action ID' }, { status: 400 })
    }

    // 验证 action 是否属于当前用户（通过 phase -> goal）
    const { data: action, error: actionError } = await supabase
      .from('actions')
      .select('id, phase_id')
      .eq('id', actionId)
      .single()

    if (actionError || !action) {
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      )
    }

    // 获取 phase
    const { data: phase, error: phaseError } = await supabase
      .from('phases')
      .select('id, goal_id')
      .eq('id', action.phase_id)
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

    // 检查是否是当前行动，如果是，需要清理系统状态
    const systemState = await getSystemState(user.id)
    if (systemState?.current_action_id === actionId) {
      // 清理系统状态（行动）
      // 注意：如果删除的是当前行动，需要找到下一个行动，或者清理状态
      // 这里简化处理：直接清理行动状态，让用户重新设置当前目标
      await updateSystemState(user.id, {
        current_action_id: null,
      })
    }

    // 真删除
    const { error } = await supabase
      .from('actions')
      .delete()
      .eq('id', actionId)

    if (error) {
      console.error('Error deleting action:', error)
      return NextResponse.json(
        { error: 'Failed to delete action' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete action API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

