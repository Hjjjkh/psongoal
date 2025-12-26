import { redirect } from "next/navigation"
import { createClient } from '@/lib/supabase/server'
import { getSystemState } from '@/lib/system-state'
import HomeView from '@/components/home-view'

export default async function Home() {
  const supabase = await createClient()
  
  // 检查认证
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // 检查用户是否有目标
  const { data: goals } = await supabase
    .from('goals')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  const hasGoals = goals && goals.length > 0

  if (!hasGoals) {
    // 新用户没有目标，跳转到目标规划页面
    redirect('/goals')
  }

  // 获取系统状态
  const systemState = await getSystemState(user.id)
  const hasCurrentAction = systemState?.current_action_id !== null

  // 检查当前目标是否已完成
  let isGoalCompleted = false
  if (systemState?.current_goal_id) {
    const { data: currentGoalCheck } = await supabase
      .from('goals')
      .select('status')
      .eq('id', systemState.current_goal_id)
      .eq('user_id', user.id)
      .single()
    
    isGoalCompleted = currentGoalCheck?.status === 'completed'
  }

  // 检查今天是否已完成（只检查当前目标的行动）
  const today = new Date().toISOString().split('T')[0]
  let todayCompleted = false
  
  if (systemState?.current_goal_id && !isGoalCompleted) {
    // 获取当前目标的所有行动ID
    const { data: goalPhases } = await supabase
      .from('phases')
      .select('id')
      .eq('goal_id', systemState.current_goal_id)
    
    if (goalPhases && goalPhases.length > 0) {
      const phaseIds = goalPhases.map(p => p.id)
      const { data: goalActions } = await supabase
        .from('actions')
        .select('id')
        .in('phase_id', phaseIds)
      
      if (goalActions && goalActions.length > 0) {
        const actionIds = goalActions.map(a => a.id)
        const { data: todayExecution } = await supabase
          .from('daily_executions')
          .select('completed')
          .eq('user_id', user.id)
          .eq('date', today)
          .eq('completed', true)
          .in('action_id', actionIds)
          .limit(1)
        
        todayCompleted = !!(todayExecution && todayExecution.length > 0)
      }
    }
  }

  // 获取当前行动和目标信息（用于首页显示）
  let currentAction = null
  let currentGoal = null
  let goalProgress = null

  if (systemState?.current_action_id && !isGoalCompleted) {
    const { data: actionData } = await supabase
      .from('actions')
      .select(`
        *,
        phases!inner(
          *,
          goals!inner(*)
        )
      `)
      .eq('id', systemState.current_action_id)
      .single()

    if (actionData) {
      currentAction = {
        id: actionData.id,
        title: actionData.title,
        definition: actionData.definition,
        estimated_time: actionData.estimated_time,
      }
      currentGoal = actionData.phases.goals

      // 计算目标进度
      const { data: phases } = await supabase
        .from('phases')
        .select('id')
        .eq('goal_id', currentGoal.id)

      if (phases && phases.length > 0) {
        const phaseIds = phases.map(p => p.id)
        const { data: allActions } = await supabase
          .from('actions')
          .select('id, completed_at')
          .in('phase_id', phaseIds)

        if (allActions) {
          const totalActions = allActions.length
          const completedActions = allActions.filter(a => a.completed_at).length
          goalProgress = {
            total: totalActions,
            completed: completedActions,
            percentage: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
          }
        }
      }
    }
  }

  // 获取连续完成天数
  const { data: allExecutions } = await supabase
    .from('daily_executions')
    .select('date, completed')
    .eq('user_id', user.id)
    .eq('completed', true)
    .order('date', { ascending: false })

  let consecutiveDays = 0
  if (allExecutions && allExecutions.length > 0) {
    // 按日期去重，获取所有有完成记录的日期（每天只应该有一条完成记录）
    const dateMap: Record<string, boolean> = {}
    for (const e of allExecutions) {
      if (e.completed === true && e.date && typeof e.date === 'string') {
        dateMap[e.date] = true
      }
    }
    
    // 获取所有日期并排序（从新到旧）
    const sortedDates = Object.keys(dateMap).sort().reverse()
    
    if (sortedDates.length > 0) {
      const todayForConsecutive = new Date()
      todayForConsecutive.setHours(0, 0, 0, 0)
      const todayStrForConsecutive = todayForConsecutive.toISOString().split('T')[0]
      
      // 检查今天是否有完成记录
      const todayHasCompletion = dateMap[todayStrForConsecutive] === true
      
      // 从今天或昨天开始计算（如果今天没有完成，从昨天开始）
      let checkDate = new Date(todayForConsecutive)
      if (!todayHasCompletion) {
        checkDate.setDate(checkDate.getDate() - 1)
      }
      
      // 连续往前检查，直到找到没有完成记录的一天
      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0]
        
        if (dateMap[dateStr] === true) {
          consecutiveDays++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
    }
  }

  return (
    <HomeView
      hasCurrentAction={hasCurrentAction && !isGoalCompleted}
      todayCompleted={todayCompleted}
      currentAction={currentAction}
      currentGoal={currentGoal}
      goalProgress={goalProgress}
      consecutiveDays={consecutiveDays}
      isGoalCompleted={isGoalCompleted}
    />
  )
}

