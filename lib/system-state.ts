import { createClient } from './supabase/server'
import type { SystemState, Action, Phase, Goal } from './types'

/**
 * 获取当前系统状态
 */
export async function getSystemState(userId: string): Promise<SystemState | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('system_states')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching system state:', error)
    return null
  }

  return data
}

/**
 * 初始化系统状态（如果不存在）
 */
export async function initSystemState(userId: string): Promise<SystemState | null> {
  const supabase = await createClient()
  
  const existing = await getSystemState(userId)
  if (existing) return existing

  const { data, error } = await supabase
    .from('system_states')
    .insert({
      user_id: userId,
      current_goal_id: null,
      current_phase_id: null,
      current_action_id: null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error initializing system state:', error)
    return null
  }

  return data
}

/**
 * 更新系统状态
 */
export async function updateSystemState(
  userId: string,
  updates: {
    current_goal_id?: string | null
    current_phase_id?: string | null
    current_action_id?: string | null
  }
): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('system_states')
    .update(updates)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating system state:', error)
    return false
  }

  return true
}

/**
 * 获取下一个 Action（推进逻辑核心）
 * 
 * 【执行力增强修改】
 * 规则：
 * 1. 推进条件必须是：actions.completed_at IS NOT NULL
 * 2. 如果当前 Action 的 completed_at 为 NULL，直接 return null（不能推进）
 * 3. 如果当前 Action 已完成（completed_at 非空），返回下一个 Action
 * 4. 如果当前 Phase 的所有 Action 都完成，返回下一个 Phase 的第一个 Action
 * 5. 如果当前 Goal 的所有 Phase 都完成，返回 null
 * 
 * 注意：不再依赖 daily_executions 的 date 字段判断推进，completed_at 是唯一真相源
 */
export async function getNextAction(
  userId: string,
  currentActionId: string
): Promise<Action | null> {
  const supabase = await createClient()

  // 【修改】检查当前 Action 是否已完成（基于 completed_at，而非 daily_executions）
  const { data: currentAction } = await supabase
    .from('actions')
    .select('completed_at, phase_id')
    .eq('id', currentActionId)
    .single()

  if (!currentAction) return null

  // 【核心约束】如果当前 Action 的 completed_at 为 NULL，不能推进
  if (!currentAction.completed_at) {
    return null
  }

  // 获取当前 Phase 信息
  const { data: currentPhase } = await supabase
    .from('phases')
    .select('*, goal_id')
    .eq('id', currentAction.phase_id)
    .single()

  if (!currentPhase) return null

  const currentGoalId = currentPhase.goal_id

  // 获取当前 Phase 的所有 Action，按 order_index 排序
  const { data: phaseActions } = await supabase
    .from('actions')
    .select('*')
    .eq('phase_id', currentPhase.id)
    .order('order_index', { ascending: true })

  if (!phaseActions) return null

  // 找到当前 Action 在 Phase 中的位置
  const currentIndex = phaseActions.findIndex((a: Action) => a.id === currentActionId)

  // 如果当前 Phase 还有下一个 Action
  if (currentIndex < phaseActions.length - 1) {
    return phaseActions[currentIndex + 1]
  }

  // 当前 Phase 已完成，查找下一个 Phase
  const { data: allPhases } = await supabase
    .from('phases')
    .select('*')
    .eq('goal_id', currentGoalId)
    .order('order_index', { ascending: true })

  if (!allPhases) return null

  const currentPhaseIndex = allPhases.findIndex((p: Phase) => p.id === currentPhase.id)

  // 如果还有下一个 Phase
  if (currentPhaseIndex < allPhases.length - 1) {
    const nextPhase = allPhases[currentPhaseIndex + 1]
    
    // 获取下一个 Phase 的第一个 Action
    const { data: nextAction } = await supabase
      .from('actions')
      .select('*')
      .eq('phase_id', nextPhase.id)
      .order('order_index', { ascending: true })
      .limit(1)
      .single()

    return nextAction
  }

  // 所有 Phase 都已完成
  return null
}

/**
 * 完成当前 Action 并推进到下一个
 * 
 * 【执行力增强修改】
 * 规则：
 * 1. 完成 Action 时，必须执行两个原子步骤：
 *    a) 记录 daily_executions（用于统计与复盘）
 *    b) 同时更新 actions.completed_at = today（推进的唯一真相源）
 * 2. 如果 Action 已经有 completed_at，直接拒绝再次完成
 * 3. 推进逻辑基于 completed_at，而不是 date
 * 4. 当没有 nextAction（Goal 完成）时，必须显式更新 system_states.current_action_id = null
 */
export async function completeActionAndAdvance(
  userId: string,
  actionId: string,
  difficulty: number,
  energy: number
): Promise<{ success: boolean; nextActionId: string | null }> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // 【核心约束】检查 Action 是否已经完成（completed_at 非空）
  const { data: existingAction } = await supabase
    .from('actions')
    .select('completed_at')
    .eq('id', actionId)
    .single()

  if (!existingAction) {
    console.error('Action not found:', actionId)
    return { success: false, nextActionId: null }
  }

  // 【关键约束】如果 Action 已经有 completed_at，拒绝再次完成
  if (existingAction.completed_at) {
    console.error('Action already completed, cannot complete again:', actionId)
    return { success: false, nextActionId: null }
  }

  // 1. 原子步骤 a：记录今日执行（用于统计与复盘）
  const { error: executionError } = await supabase
    .from('daily_executions')
    .upsert({
      action_id: actionId,
      user_id: userId,
      date: today,
      completed: true,
      difficulty,
      energy,
    }, {
      onConflict: 'action_id,date,user_id'
    })

  if (executionError) {
    console.error('Error recording execution:', executionError)
    return { success: false, nextActionId: null }
  }

  // 2. 原子步骤 b：更新 actions.completed_at（推进的唯一真相源）
  const { error: updateActionError } = await supabase
    .from('actions')
    .update({ completed_at: today })
    .eq('id', actionId)

  if (updateActionError) {
    console.error('Error updating action completed_at:', updateActionError)
    return { success: false, nextActionId: null }
  }

  // 3. 获取下一个 Action（基于 completed_at 判断）
  const nextAction = await getNextAction(userId, actionId)

  // 4. 更新系统状态
  if (nextAction) {
    // 获取 nextAction 的 phase
    const { data: nextPhase } = await supabase
      .from('phases')
      .select('goal_id')
      .eq('id', nextAction.phase_id)
      .single()

    if (nextPhase) {
      await updateSystemState(userId, {
        current_action_id: nextAction.id,
        current_phase_id: nextAction.phase_id,
        current_goal_id: nextPhase.goal_id,
      })
    }

    return { success: true, nextActionId: nextAction.id }
  } else {
    // 【重要】没有下一个 Action（Goal 完成），必须显式更新 system_states.current_action_id = null
    await updateSystemState(userId, {
      current_action_id: null,
      // current_phase_id 和 current_goal_id 可以保留，用于显示已完成的目标信息
    })
    
    // 可选：标记 Goal 为 completed（如果业务需要）
    // 注意：这里需要获取当前 Goal ID，可以通过 systemState 获取
    const systemState = await getSystemState(userId)
    if (systemState?.current_goal_id) {
      await supabase
        .from('goals')
        .update({ status: 'completed' })
        .eq('id', systemState.current_goal_id)
        .eq('user_id', userId)
    }

    return { success: true, nextActionId: null }
  }
}

/**
 * 标记 Action 为未完成（不推进）
 * 
 * 【执行力增强修改】
 * 规则：
 * 1. 不允许撤销已完成（completed_at 非空）的 Action
 * 2. 如果 action.completed_at 已存在，直接返回 false
 * 3. daily_executions 的 incomplete 只允许发生在当日、未完成 Action 上
 */
export async function markActionIncomplete(
  userId: string,
  actionId: string
): Promise<boolean> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // 【核心约束】检查 Action 是否已经完成（completed_at 非空）
  const { data: action } = await supabase
    .from('actions')
    .select('completed_at')
    .eq('id', actionId)
    .single()

  if (!action) {
    console.error('Action not found:', actionId)
    return false
  }

  // 【关键约束】如果 Action 已经有 completed_at，不允许撤销
  if (action.completed_at) {
    console.error('Cannot mark completed action as incomplete:', actionId)
    return false
  }

  // 只允许在未完成的 Action 上记录 incomplete
  const { error } = await supabase
    .from('daily_executions')
    .upsert({
      action_id: actionId,
      user_id: userId,
      date: today,
      completed: false,
      difficulty: null,
      energy: null,
    }, {
      onConflict: 'action_id,date,user_id'
    })

  if (error) {
    console.error('Error marking action incomplete:', error)
    return false
  }

  return true
}

