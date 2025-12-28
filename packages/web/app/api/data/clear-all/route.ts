import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 删除用户的所有数据（除了账户信息）
 * 危险操作，需要双重确认
 */
export async function DELETE() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 使用事务确保数据一致性
    // 注意：Supabase 的 JavaScript 客户端不支持事务，所以需要按顺序删除
    
    // 1. 删除执行记录（daily_executions）
    const { error: executionsError } = await supabase
      .from('daily_executions')
      .delete()
      .eq('user_id', user.id)
    
    if (executionsError) {
      console.error('Error deleting daily_executions:', executionsError)
      return NextResponse.json(
        { error: 'Failed to delete execution records', details: executionsError.message },
        { status: 500 }
      )
    }

    // 2. 删除待办事项（todos）
    const { error: todosError } = await supabase
      .from('todos')
      .delete()
      .eq('user_id', user.id)
    
    if (todosError) {
      console.error('Error deleting todos:', todosError)
      return NextResponse.json(
        { error: 'Failed to delete todos', details: todosError.message },
        { status: 500 }
      )
    }

    // 3. 删除专注会话（focus_sessions）
    const { error: focusSessionsError } = await supabase
      .from('focus_sessions')
      .delete()
      .eq('user_id', user.id)
    
    if (focusSessionsError) {
      console.error('Error deleting focus_sessions:', focusSessionsError)
      return NextResponse.json(
        { error: 'Failed to delete focus sessions', details: focusSessionsError.message },
        { status: 500 }
      )
    }

    // 4. 删除目标（goals）- 级联删除 phases 和 actions
    const { error: goalsError } = await supabase
      .from('goals')
      .delete()
      .eq('user_id', user.id)
    
    if (goalsError) {
      console.error('Error deleting goals:', goalsError)
      return NextResponse.json(
        { error: 'Failed to delete goals', details: goalsError.message },
        { status: 500 }
      )
    }

    // 5. 删除用户创建的目标模板（goal_templates）- 不包括系统模板
    const { error: templatesError } = await supabase
      .from('goal_templates')
      .delete()
      .eq('user_id', user.id)
      .eq('is_system', false)
    
    if (templatesError) {
      console.error('Error deleting goal_templates:', templatesError)
      return NextResponse.json(
        { error: 'Failed to delete goal templates', details: templatesError.message },
        { status: 500 }
      )
    }

    // 6. 删除用户创建的行动模板（action_templates）
    const { error: actionTemplatesError } = await supabase
      .from('action_templates')
      .delete()
      .eq('user_id', user.id)
    
    if (actionTemplatesError) {
      console.error('Error deleting action_templates:', actionTemplatesError)
      return NextResponse.json(
        { error: 'Failed to delete action templates', details: actionTemplatesError.message },
        { status: 500 }
      )
    }

    // 7. 重置系统状态（system_states）- 但保留用户ID关联
    const { error: systemStateError } = await supabase
      .from('system_states')
      .update({
        current_goal_id: null,
        current_phase_id: null,
        current_action_id: null,
        reminder_enabled: false,
        reminder_time: null,
      })
      .eq('user_id', user.id)
    
    if (systemStateError) {
      console.error('Error resetting system_states:', systemStateError)
      return NextResponse.json(
        { error: 'Failed to reset system state', details: systemStateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '所有数据已删除（账户信息已保留）',
      deleted: {
        executions: '已删除',
        todos: '已删除',
        focusSessions: '已删除',
        goals: '已删除（包括阶段和行动）',
        goalTemplates: '已删除（用户创建的模板）',
        actionTemplates: '已删除',
        systemState: '已重置',
      },
    })
  } catch (error) {
    console.error('Error clearing all data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to clear all data', details: errorMessage },
      { status: 500 }
    )
  }
}

