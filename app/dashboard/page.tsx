import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSystemState } from '@/lib/system-state'
import DashboardView from '@/components/dashboard-view'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // 检查认证（后备检查，middleware 应该已经处理了认证和重定向）
  // 如果 middleware 正常工作，这里不会执行到
  // 如果 middleware 失效，这里作为后备保障
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    // Middleware 应该已经重定向，但如果到达这里，执行重定向
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
          .select('id, order_index, completed_at')
          .eq('phase_id', phase.id)
          .order('order_index', { ascending: true })

        if (actions && actions.length > 0) {
          totalActions += actions.length

          // 检查每个 action 的完成情况（基于 completed_at，这是推进的唯一真相源）
          for (const action of actions) {
            if (action.completed_at) {
              completedActions++
            }
          }

          // 检查是否卡住（超过 7 天未完成）
          // 根据"每日唯一行动"设计，检查当前应该执行的行动是否超过7天未完成
          // 找到第一个未完成的行动（这是当前应该执行的行动）
          const firstIncompleteAction = actions.find(a => !a.completed_at)
          if (firstIncompleteAction) {
            // 检查该行动的最近执行记录
            const { data: lastExecution } = await supabase
              .from('daily_executions')
              .select('date, completed')
              .eq('action_id', firstIncompleteAction.id)
              .eq('user_id', user.id)
              .order('date', { ascending: false })
              .limit(1)

            if (lastExecution && lastExecution.length > 0) {
              const lastDate = new Date(lastExecution[0].date)
              lastDate.setHours(0, 0, 0, 0)
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const daysSince = Math.floor(
                (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
              )
              // 如果最近执行记录是未完成的，且超过7天，说明卡住了
              if (daysSince > 7 && !lastExecution[0].completed) {
                stuckPhases.push({ phaseId: phase.id, days: daysSince })
              }
            } else {
              // 如果从未执行过，检查是否有已完成的行动（说明曾经执行过）
              const hasCompletedAction = actions.some(a => a.completed_at)
              if (hasCompletedAction) {
                // 曾经执行过，但现在卡在未完成的行动上
                // 计算从最后一个完成行动到现在的时间
                const lastCompletedAction = actions
                  .filter(a => a.completed_at)
                  .sort((a, b) => {
                    const dateA = new Date(a.completed_at || 0)
                    const dateB = new Date(b.completed_at || 0)
                    return dateB.getTime() - dateA.getTime()
                  })[0]
                
                if (lastCompletedAction && lastCompletedAction.completed_at) {
                  const lastCompletedDate = new Date(lastCompletedAction.completed_at)
                  lastCompletedDate.setHours(0, 0, 0, 0)
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const daysSince = Math.floor(
                    (today.getTime() - lastCompletedDate.getTime()) / (1000 * 60 * 60 * 24)
                  )
                  if (daysSince > 7) {
                    stuckPhases.push({ phaseId: phase.id, days: daysSince })
                  }
                }
              }
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

  // 检查用户是否有当前行动（用于显示快捷入口和确定复盘目标）
  const systemState = await getSystemState(user.id)
  const hasCurrentAction = systemState?.current_action_id !== null

  // 计算连续完成天数
  // 规则：从今天开始往前检查，如果今天没有完成，从昨天开始计算
  // 注意：连续完成天数是跨目标计算的，体现用户的整体持续执行能力
  // 即使完成了当前目标，开始新目标，连续完成天数也会继续计算
  const todayForConsecutive = new Date()
  todayForConsecutive.setHours(0, 0, 0, 0)
  const todayStrForConsecutive = todayForConsecutive.toISOString().split('T')[0]
  
  // 获取所有完成记录，按日期去重（每天只应该有一条完成记录）
  // 注意：不区分目标，跨目标统计，体现用户的整体执行情况
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

  // 获取最近30天的执行反馈数据（用于复盘）
  // 时区处理：使用 ISO 格式确保一致性
  // 注意：复盘数据应该显示当前目标的执行情况，而不是所有目标
  // 如果当前目标已完成或没有当前目标，显示最近一个目标的执行情况
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  // 确定要显示的目标ID（当前目标或最近一个目标）
  let targetGoalId: string | null = null
  if (systemState?.current_goal_id) {
    targetGoalId = systemState.current_goal_id
  } else if (goals && goals.length > 0) {
    // 如果没有当前目标，使用最近一个目标
    targetGoalId = goals[0].id
  }

  // 获取目标的所有行动ID（用于筛选执行记录）
  let targetActionIds: string[] = []
  if (targetGoalId) {
    // 获取目标的所有 phases
    const { data: targetPhases } = await supabase
      .from('phases')
      .select('id')
      .eq('goal_id', targetGoalId)

    if (targetPhases && targetPhases.length > 0) {
      const phaseIds = targetPhases.map(p => p.id)
      // 获取所有 actions
      const { data: targetActions } = await supabase
        .from('actions')
        .select('id')
        .in('phase_id', phaseIds)

      if (targetActions && targetActions.length > 0) {
        targetActionIds = targetActions.map(a => a.id)
      }
    }
  }

  // 明确排序，确保数据顺序一致
  // 注意：只显示当前目标（或最近一个目标）的执行情况
  let recentExecutionsQuery = supabase
    .from('daily_executions')
    .select('date, completed, difficulty, energy')
    .eq('user_id', user.id)
    .gte('date', thirtyDaysAgoStr)

  // 如果有目标，只查询该目标的执行记录
  if (targetActionIds.length > 0) {
    recentExecutionsQuery = recentExecutionsQuery.in('action_id', targetActionIds)
  }

  const { data: recentExecutions } = await recentExecutionsQuery.order('date', { ascending: true })

  // 处理最近30天的数据，按日期分组
  // 数据结构：每天一条记录，包含完成情况和平均难度/精力
  interface DayData {
    date: string
    completed: number
    total: number
    avgDifficulty: number | null
    avgEnergy: number | null
  }

  const dailyStats: DayData[] = []
  const today = new Date()
  
  // 生成最近30天的日期数组
  // 注意：使用倒序循环 (29 -> 0) 确保即使数据库缺天数，也不会出现 index 越界
  // 因为我们是基于固定日期范围生成数组，而不是基于数据库返回的数据量
  const todayStr = today.toISOString().split('T')[0]
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    // 从查询结果中筛选当天的执行记录
    // 根据"每日唯一行动"设计，每天应该只有一条完成记录
    const dayExecutions = (recentExecutions || []).filter(e => e.date === dateStr)
    const completedCount = dayExecutions.filter(e => e.completed).length
    let totalCount = dayExecutions.length
    
    // 【重要】如果今天是今天，且有当前行动，但没有执行记录，应该认为今天有行动但未完成
    // 这样可以正确显示"今天未完成"状态，而不是"无记录"
    if (dateStr === todayStr && hasCurrentAction && totalCount === 0) {
      // 今天有行动但还没有执行记录（既未完成也未标记为未完成）
      // 为了在图表中正确显示，设置 total = 1, completed = 0
      totalCount = 1
    }
    
    // 计算平均难度和精力
    // 重要：只统计 completed=true 且 difficulty/energy 非 null 的数据
    // 根据"每日唯一行动"设计，每天应该只有一条完成记录，所以直接取第一条
    const completedExecution = dayExecutions.find(
      e => e.completed && e.difficulty !== null && e.energy !== null
    )
    const avgDifficulty = completedExecution?.difficulty ?? null
    const avgEnergy = completedExecution?.energy ?? null
    
    dailyStats.push({
      date: dateStr,
      completed: completedCount,
      total: totalCount,
      avgDifficulty,
      avgEnergy,
    })
  }

  // 检查今天是否已完成（用于复盘面板显示）
  // 注意：只检查当前目标（或最近一个目标）的行动是否完成
  const todayForCheck = new Date()
  todayForCheck.setHours(0, 0, 0, 0)
  const todayStrForCheck = todayForCheck.toISOString().split('T')[0]
  
  let todayCompleted = false
  if (targetActionIds.length > 0) {
    // 只检查当前目标的行动是否完成
    const { data: todayExecution } = await supabase
      .from('daily_executions')
      .select('completed')
      .eq('user_id', user.id)
      .eq('date', todayStrForCheck)
      .eq('completed', true)
      .in('action_id', targetActionIds)
      .limit(1)
    
    todayCompleted = !!(todayExecution && todayExecution.length > 0)
  } else {
    // 如果没有目标或没有行动，认为未完成
    todayCompleted = false
  }

  return (
    <DashboardView
      goals={goalsWithStats}
      consecutiveDays={consecutiveDays}
      dailyStats={dailyStats}
      hasCurrentAction={hasCurrentAction}
      todayCompleted={todayCompleted}
    />
  )
}

