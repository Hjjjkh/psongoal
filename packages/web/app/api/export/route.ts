import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 导出用户所有数据为 JSON
 */
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 获取所有 Goals
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (goalsError) {
      throw goalsError
    }

    // 获取所有 Phases
    const goalIds = goals?.map(g => g.id) || []
    const { data: phases, error: phasesError } = goalIds.length > 0
      ? await supabase
          .from('phases')
          .select('*')
          .in('goal_id', goalIds)
          .order('order_index', { ascending: true })
      : { data: [], error: null }

    if (phasesError) {
      throw phasesError
    }

    // 获取所有 Actions
    const phaseIds = phases?.map(p => p.id) || []
    const { data: actions, error: actionsError } = phaseIds.length > 0
      ? await supabase
          .from('actions')
          .select('*')
          .in('phase_id', phaseIds)
          .order('order_index', { ascending: true })
      : { data: [], error: null }

    if (actionsError) {
      throw actionsError
    }

    // 获取所有 DailyExecutions
    const actionIds = actions?.map(a => a.id) || []
    const { data: executions, error: executionsError } = actionIds.length > 0
      ? await supabase
          .from('daily_executions')
          .select('*')
          .eq('user_id', user.id)
          .in('action_id', actionIds)
          .order('date', { ascending: false })
      : { data: [], error: null }

    if (executionsError) {
      throw executionsError
    }

    // 获取 SystemState
    const { data: systemState, error: systemStateError } = await supabase
      .from('system_states')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (systemStateError && systemStateError.code !== 'PGRST116') {
      throw systemStateError
    }

    // 构建导出数据
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      userId: user.id,
      data: {
        goals: goals || [],
        phases: phases || [],
        actions: actions || [],
        executions: executions || [],
        systemState: systemState || null,
      },
    }

    // 返回 JSON 文件
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="pes-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('导出数据失败:', error)
    return NextResponse.json(
      { error: '导出数据失败，请重试' },
      { status: 500 }
    )
  }
}

