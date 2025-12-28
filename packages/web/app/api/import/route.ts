import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ImportData {
  version?: string
  exportDate?: string
  userId?: string
  data: {
    goals: any[]
    phases: any[]
    actions: any[]
    executions: any[]
    systemState: any | null
  }
}

/**
 * 导入用户数据
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const importData: ImportData = body

    // 验证数据格式
    if (!importData.data || typeof importData.data !== 'object') {
      return NextResponse.json({ error: '无效的数据格式' }, { status: 400 })
    }

    const { goals, phases, actions, executions } = importData.data

    if (!Array.isArray(goals) || !Array.isArray(phases) || !Array.isArray(actions) || !Array.isArray(executions)) {
      return NextResponse.json({ error: '数据格式不正确' }, { status: 400 })
    }

    // 验证数据完整性
    const goalIds = new Set(goals.map(g => g.id))
    const phaseIds = new Set(phases.map(p => p.id))
    const actionIds = new Set(actions.map(a => a.id))

    // 检查 phases 的 goal_id 是否都在 goals 中
    for (const phase of phases) {
      if (!goalIds.has(phase.goal_id)) {
        return NextResponse.json({ error: '数据不完整：phase 引用了不存在的 goal' }, { status: 400 })
      }
    }

    // 检查 actions 的 phase_id 是否都在 phases 中
    for (const action of actions) {
      if (!phaseIds.has(action.phase_id)) {
        return NextResponse.json({ error: '数据不完整：action 引用了不存在的 phase' }, { status: 400 })
      }
    }

    // 检查 executions 的 action_id 是否都在 actions 中
    for (const execution of executions) {
      if (!actionIds.has(execution.action_id)) {
        return NextResponse.json({ error: '数据不完整：execution 引用了不存在的 action' }, { status: 400 })
      }
    }

    // 开始导入（使用事务）
    // 注意：Supabase 不支持事务，需要按顺序导入

    // 1. 导入 Goals（更新 user_id）
    const goalsToInsert = goals.map(goal => ({
      ...goal,
      user_id: user.id,
      id: goal.id, // 保持原 ID（如果允许）或生成新 ID
    }))

    // 检查是否要合并（如果目标已存在）
    const existingGoals = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', user.id)

    const existingGoalIds = new Set(existingGoals.data?.map(g => g.id) || [])

    // 只导入不存在的 goals
    const newGoals = goalsToInsert.filter(g => !existingGoalIds.has(g.id))
    
    if (newGoals.length > 0) {
      const { error: goalsError } = await supabase
        .from('goals')
        .insert(newGoals)

      if (goalsError) {
        throw goalsError
      }
    }

    // 2. 导入 Phases
    const phasesToInsert = phases.map(phase => ({
      ...phase,
      // 如果 goal_id 已存在，使用原 ID，否则需要映射
    }))

    const { error: phasesError } = await supabase
      .from('phases')
      .upsert(phasesToInsert, { onConflict: 'id' })

    if (phasesError) {
      throw phasesError
    }

    // 3. 导入 Actions
    const { error: actionsError } = await supabase
      .from('actions')
      .upsert(actions, { onConflict: 'id' })

    if (actionsError) {
      throw actionsError
    }

    // 4. 导入 Executions（更新 user_id）
    const executionsToInsert = executions.map(execution => ({
      ...execution,
      user_id: user.id,
    }))

    const { error: executionsError } = await supabase
      .from('daily_executions')
      .upsert(executionsToInsert, { onConflict: 'id' })

    if (executionsError) {
      throw executionsError
    }

    // 5. 导入 SystemState（如果存在）
    if (importData.data.systemState) {
      const { error: systemStateError } = await supabase
        .from('system_states')
        .upsert({
          ...importData.data.systemState,
          user_id: user.id,
        }, { onConflict: 'user_id' })

      if (systemStateError) {
        throw systemStateError
      }
    }

    return NextResponse.json({
      success: true,
      imported: {
        goals: newGoals.length,
        phases: phases.length,
        actions: actions.length,
        executions: executions.length,
      },
    })
  } catch (error) {
    console.error('导入数据失败:', error)
    const errorMessage = error instanceof Error ? error.message : '导入数据失败，请重试'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

