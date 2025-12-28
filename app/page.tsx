import { redirect } from "next/navigation"
import { createClient } from '@/lib/supabase/server'
import { getSystemState } from '@/lib/system-state'
import { calculateConsecutiveDays } from '@/lib/utils/stats'
import dynamic from 'next/dynamic'
import LoadingSpinner from '@/components/loading-spinner'

// 动态导入 HomeView，禁用 SSR 以避免 hydration 错误
const HomeView = dynamic(() => import('@/components/home-view'), {
  ssr: false,
  loading: () => <LoadingSpinner message="加载中..." />,
})

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

  // 优化：合并查询以减少数据库往返
  const today = new Date().toISOString().split('T')[0]
  let isGoalCompleted = false
  let todayCompleted = false
  let currentAction = null
  let currentGoal = null
  let goalProgress = null

  if (systemState?.current_goal_id) {
    // 一次性获取当前目标的状态和基本信息
    const { data: currentGoalData } = await supabase
      .from('goals')
      .select('id, name, status, category, start_date, end_date')
      .eq('id', systemState.current_goal_id)
      .eq('user_id', user.id)
      .single()
    
    if (currentGoalData) {
      isGoalCompleted = currentGoalData.status === 'completed'
      currentGoal = currentGoalData

      // 如果目标未完成，获取行动和完成状态
      if (!isGoalCompleted && systemState?.current_action_id) {
        // 一次性获取当前行动和目标进度
        const { data: actionData } = await supabase
          .from('actions')
          .select(`
            id,
            title,
            definition,
            estimated_time,
            completed_at,
            phases!inner(
              id,
              goals!inner(id)
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

          // 获取所有阶段和行动以计算进度
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

              // 检查今天是否已完成（使用已获取的行动ID）
              // 【数据独立性保障】直接查询 daily_executions，不依赖 action 的存在
              const actionIds = allActions.map(a => a.id)
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
      }
    }
  }

  // 获取连续完成天数（使用统一的统计函数）
  // 【数据独立性保障】直接查询 daily_executions，不依赖 action 的存在
  // 即使 action 被删除，历史执行记录仍然保留，确保连续天数计算的真实性
  const { data: allExecutions } = await supabase
    .from('daily_executions')
    .select('date, completed')
    .eq('user_id', user.id)
    .eq('completed', true)
    .order('date', { ascending: false })
    .limit(365) // 最多查询365天的数据，足够计算连续完成天数

  const consecutiveDays = calculateConsecutiveDays(allExecutions || [])

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

