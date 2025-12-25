import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardView from '@/components/dashboard-view'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login')
  }

  // 获取所有 Goals
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // 计算每个 Goal 的进度和统计信息
  const goalsWithStats = await Promise.all(
    (goals || []).map(async (goal) => {
      // 获取所有 phases
      const { data: phases } = await supabase
        .from('phases')
        .select('id, order_index')
        .eq('goal_id', goal.id)
        .order('order_index', { ascending: true })

      if (!phases || phases.length === 0) {
        return {
          ...goal,
          progress: 0,
          totalActions: 0,
          completedActions: 0,
          stuckPhases: [],
        }
      }

      // 获取所有 actions
      let totalActions = 0
      let completedActions = 0
      const stuckPhases: Array<{ phaseId: string; days: number }> = []

      for (const phase of phases) {
        const { data: actions } = await supabase
          .from('actions')
          .select('id, order_index')
          .eq('phase_id', phase.id)
          .order('order_index', { ascending: true })

        if (actions && actions.length > 0) {
          totalActions += actions.length

          // 检查每个 action 的完成情况
          for (const action of actions) {
            const { data: executions } = await supabase
              .from('daily_executions')
              .select('date, completed')
              .eq('action_id', action.id)
              .eq('user_id', user.id)
              .eq('completed', true)
              .order('date', { ascending: false })
              .limit(1)

            if (executions && executions.length > 0) {
              completedActions++
            }
          }

          // 检查是否卡住（超过 7 天未完成）
          const { data: lastExecution } = await supabase
            .from('daily_executions')
            .select('date, completed')
            .eq('action_id', actions[0].id)
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(1)

          if (lastExecution && lastExecution.length > 0) {
            const lastDate = new Date(lastExecution[0].date)
            const daysSince = Math.floor(
              (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
            )
            if (daysSince > 7 && !lastExecution[0].completed) {
              stuckPhases.push({ phaseId: phase.id, days: daysSince })
            }
          }
        }
      }

      const progress = totalActions > 0
        ? Math.round((completedActions / totalActions) * 100)
        : 0

      return {
        ...goal,
        progress,
        totalActions,
        completedActions,
        stuckPhases,
      }
    })
  )

  // 计算连续完成天数
  const { data: allExecutions } = await supabase
    .from('daily_executions')
    .select('date, completed')
    .eq('user_id', user.id)
    .eq('completed', true)
    .order('date', { ascending: false })

  let consecutiveDays = 0
  if (allExecutions && allExecutions.length > 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let checkDate = new Date(today)
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const hasExecution = allExecutions.some(
        e => e.date === dateStr && e.completed === true
      )
      
      if (hasExecution) {
        consecutiveDays++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
  }

  return (
    <DashboardView
      goals={goalsWithStats}
      consecutiveDays={consecutiveDays}
    />
  )
}

