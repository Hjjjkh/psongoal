import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'

import LoadingSpinner from '@/components/loading-spinner'

// 动态导入 GoalsView，优化初始加载
const GoalsView = dynamic(() => import('@/components/goals-view'), {
  loading: () => <LoadingSpinner message="加载目标数据..." />,
})

export default async function GoalsPage() {
  const supabase = await createClient()
  
  // 检查认证（后备检查，middleware 应该已经处理了认证和重定向）
  // 如果 middleware 正常工作，这里不会执行到
  // 如果 middleware 失效，这里作为后备保障
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    // Middleware 应该已经重定向，但如果到达这里，执行重定向
    redirect('/auth/login')
  }

  // 【性能优化】获取所有 Goals，使用索引优化查询
  // 确保 goals 表有 user_id 和 created_at 的复合索引
  // 不限制数量，确保加载所有目标（如果将来数据量很大，可以考虑实现分页）
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!goals || goals.length === 0) {
    return <GoalsView goals={[]} />
  }

  // 【性能优化】批量获取所有 phases 和 actions，减少查询次数
  const goalIds = goals.map(g => g.id)
  
  if (goalIds.length === 0) {
    return <GoalsView goals={[]} />
  }

  // 先获取所有 phases（并行查询优化）
  const { data: allPhases } = await supabase
    .from('phases')
    .select('*')
    .in('goal_id', goalIds)
    .order('order_index', { ascending: true })

  const phases = allPhases || []
  const phaseIds = phases.map(p => p.id)

  // 批量获取所有 actions（如果有 phases）
  const { data: allActions } = phaseIds.length > 0
    ? await supabase
        .from('actions')
        .select('*')
        .in('phase_id', phaseIds)
        .order('order_index', { ascending: true })
    : { data: [] }

  const actions = allActions || []

  // 在内存中组织数据，避免嵌套查询
  const phasesByGoal = new Map<string, typeof phases>()
  const actionsByPhase = new Map<string, typeof actions>()

  phases.forEach(phase => {
    if (!phasesByGoal.has(phase.goal_id)) {
      phasesByGoal.set(phase.goal_id, [])
    }
    phasesByGoal.get(phase.goal_id)!.push(phase)
  })

  actions.forEach(action => {
    if (!actionsByPhase.has(action.phase_id)) {
      actionsByPhase.set(action.phase_id, [])
    }
    actionsByPhase.get(action.phase_id)!.push(action)
  })

  // 组装数据
  const goalsWithDetails = goals.map(goal => {
    const goalPhases = phasesByGoal.get(goal.id) || []
    const phasesWithActions = goalPhases.map(phase => ({
      ...phase,
      actions: actionsByPhase.get(phase.id) || []
    }))
    return { ...goal, phases: phasesWithActions }
  })

  return <GoalsView goals={goalsWithDetails || []} />
}

