import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSystemState } from '@/lib/system-state'
import { calculateConsecutiveDays } from '@/lib/utils/stats'
import { MAX_CONSECUTIVE_DAYS_QUERY } from '@/lib/constants/review'
import GoalCelebrationView from '@/components/goal-celebration-view'

/**
 * 目标完成庆祝页面
 * 显示目标完成统计和引导用户下一步操作
 */
export default async function GoalCompletePage() {
  const supabase = await createClient()
  
  // 检查认证
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // 获取系统状态
  const systemState = await getSystemState(user.id)
  
  // 如果没有当前目标或目标未完成，重定向到首页
  if (!systemState?.current_goal_id) {
    redirect('/')
  }

  // 获取当前目标信息
  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', systemState.current_goal_id)
    .eq('user_id', user.id)
    .single()

  if (!goal || goal.status !== 'completed') {
    redirect('/')
  }

  // 获取目标的所有阶段和行动
  const { data: phases } = await supabase
    .from('phases')
    .select('id')
    .eq('goal_id', goal.id)

  let totalActions = 0
  let completedActions = 0

  if (phases && phases.length > 0) {
    const phaseIds = phases.map(p => p.id)
    const { data: allActions } = await supabase
      .from('actions')
      .select('id, completed_at')
      .in('phase_id', phaseIds)

    if (allActions) {
      totalActions = allActions.length
      completedActions = allActions.filter(a => a.completed_at).length
    }
  }

  // 获取目标的所有执行记录（用于统计）
  const phaseIds = phases?.map(p => p.id) || []
  let allActionIds: string[] = []
  if (phaseIds.length > 0) {
    const { data: allActions } = await supabase
      .from('actions')
      .select('id')
      .in('phase_id', phaseIds)
    allActionIds = allActions?.map(a => a.id) || []
  }

  // 获取目标的所有完成记录
  const { data: goalExecutions } = allActionIds.length > 0
    ? await supabase
        .from('daily_executions')
        .select('date, completed, difficulty, energy')
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('action_id', allActionIds)
        .order('date', { ascending: true })
    : { data: [] }

  // 计算平均难度和精力
  const completedExecutions = goalExecutions?.filter(e => e.completed && e.difficulty !== null && e.energy !== null) || []
  const avgDifficulty = completedExecutions.length > 0
    ? completedExecutions.reduce((sum, e) => sum + (e.difficulty || 0), 0) / completedExecutions.length
    : null
  const avgEnergy = completedExecutions.length > 0
    ? completedExecutions.reduce((sum, e) => sum + (e.energy || 0), 0) / completedExecutions.length
    : null

  // 获取连续完成天数（跨目标）
  // 优化：限制查询范围，最多查询365天，提高性能
  // 优化：使用统一的工具函数计算连续天数
  const { data: allExecutions } = await supabase
    .from('daily_executions')
    .select('date, completed')
    .eq('user_id', user.id)
    .eq('completed', true)
    .order('date', { ascending: false })
    .limit(MAX_CONSECUTIVE_DAYS_QUERY) // 最多查询指定天数的数据，足够计算连续完成天数

  // 使用统一的工具函数计算连续天数
  const consecutiveDays = calculateConsecutiveDays(allExecutions || [])

  return (
    <GoalCelebrationView
      goal={goal}
      totalActions={totalActions}
      completedActions={completedActions}
      startDate={goal.start_date}
      endDate={goal.end_date}
      consecutiveDays={consecutiveDays}
      avgDifficulty={avgDifficulty}
      avgEnergy={avgEnergy}
      executionDates={goalExecutions?.map(e => e.date).filter((d): d is string => typeof d === 'string') || []}
    />
  )
}

