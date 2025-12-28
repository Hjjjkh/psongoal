import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSystemState } from '@/lib/system-state'
import { generateInsights, type DayData } from '@/lib/insights'
import { calculateConsecutiveDays } from '@/lib/utils/stats'
import { MAX_CONSECUTIVE_DAYS_QUERY, REVIEW_DAYS_RANGE, REVIEW_HISTORY_LIMIT, STUCK_PHASE_THRESHOLD_DAYS } from '@/lib/constants/review'
import dynamicImport from 'next/dynamic'

import LoadingSpinner from '@/components/loading-spinner'

// 动态导入 DashboardView，优化初始加载
const DashboardView = dynamicImport(() => import('@/components/dashboard-view'), {
  loading: () => <LoadingSpinner message="加载复盘数据..." />,
})

// 【性能优化】使用 ISR (Incremental Static Regeneration)
// 60秒缓存，平衡实时性和性能
// 如果需要实时数据，可以在客户端使用 SWR 或 React Query
export const revalidate = 60
// 移除 force-dynamic，允许缓存

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

  // 优化：批量获取所有 phases 和 actions，减少查询次数
  const goalIds = (goals || []).map(g => g.id)
  
  // 先获取所有 phases
  const { data: allPhases } = await supabase
    .from('phases')
    .select('id, order_index, goal_id')
    .in('goal_id', goalIds)
    .order('order_index', { ascending: true })

  const phaseIds = allPhases?.map(p => p.id) || []

  // 批量获取所有 actions（如果有 phases）
  const { data: allActions } = phaseIds.length > 0
    ? await supabase
        .from('actions')
        .select('id, order_index, completed_at, phase_id')
        .in('phase_id', phaseIds)
        .order('order_index', { ascending: true })
    : { data: [] }

  const phases = allPhases || []
  const actions = allActions || []

  // 在内存中组织数据
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

  // 批量获取执行记录（用于检查卡住状态）
  // 【数据独立性保障】只查询当前存在的 action 的执行记录
  // 使用 in('action_id', actionIds) 过滤，但即使 action 被删除，历史记录仍然保留
  const actionIds = actions.map(a => a.id)
  const { data: executionsForStuckCheck } = actionIds.length > 0
    ? await supabase
        .from('daily_executions')
        .select('action_id, date, completed')
        .in('action_id', actionIds)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        // 【产品功能】不限制查询数量，确保所有执行记录都能被查询到
        // 性能优化通过索引实现，而不是限制查询数量
    : { data: [] }

  const executionsByAction = new Map<string, Array<{ action_id: string; date: string; completed: boolean }>>()
  executionsForStuckCheck?.forEach(exec => {
    if (!executionsByAction.has(exec.action_id)) {
      executionsByAction.set(exec.action_id, [])
    }
    const execList = executionsByAction.get(exec.action_id)
    if (execList) {
      execList.push(exec)
    }
  })

  // 计算每个 Goal 的进度和统计信息
  const goalsWithStats = (goals || []).map(goal => {
    const phases = phasesByGoal.get(goal.id) || []
    
    if (phases.length === 0) {
      return {
        ...goal,
        progress: 0,
        totalActions: 0,
        completedActions: 0,
        stuckPhases: [],
      }
    }

    let totalActions = 0
    let completedActions = 0
    const stuckPhases: Array<{ phaseId: string; days: number }> = []

    phases.forEach(phase => {
      const actions = actionsByPhase.get(phase.id) || []
      
      if (actions.length > 0) {
        totalActions += actions.length

        actions.forEach(action => {
          if (action.completed_at) {
            completedActions++
          }
        })

        // 检查是否卡住
        const firstIncompleteAction = actions.find(a => !a.completed_at)
        if (firstIncompleteAction) {
          const executions = executionsByAction.get(firstIncompleteAction.id) || []
          const lastExecution = executions[0]

          if (lastExecution) {
            const lastDate = new Date(lastExecution.date)
            lastDate.setHours(0, 0, 0, 0)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const daysSince = Math.floor(
              (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
            )
            if (daysSince > STUCK_PHASE_THRESHOLD_DAYS && !lastExecution.completed) {
              stuckPhases.push({ phaseId: phase.id, days: daysSince })
            }
          } else {
            const hasCompletedAction = actions.some(a => a.completed_at)
            if (hasCompletedAction) {
              const lastCompletedAction = actions
                .filter(a => a.completed_at)
                .sort((a, b) => {
                  const dateA = new Date(a.completed_at || 0)
                  const dateB = new Date(b.completed_at || 0)
                  return dateB.getTime() - dateA.getTime()
                })[0]
              
              if (lastCompletedAction?.completed_at) {
                const lastCompletedDate = new Date(lastCompletedAction.completed_at)
                lastCompletedDate.setHours(0, 0, 0, 0)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const daysSince = Math.floor(
                  (today.getTime() - lastCompletedDate.getTime()) / (1000 * 60 * 60 * 24)
                )
                if (daysSince > STUCK_PHASE_THRESHOLD_DAYS) {
                  stuckPhases.push({ phaseId: phase.id, days: daysSince })
                }
              }
            }
          }
        }
      }
    })

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

  // 检查用户是否有当前行动（用于显示快捷入口和确定复盘目标）
  const systemState = await getSystemState(user.id)
  const hasCurrentAction = systemState?.current_action_id !== null

  // 计算连续完成天数
  // 规则：从今天开始往前检查，如果今天没有完成，从昨天开始计算
  // 获取连续完成天数（使用统一的统计函数）
  // 注意：连续完成天数是跨目标计算的，体现用户的整体持续执行能力
  // 【数据独立性保障】直接查询 daily_executions，不依赖 action 的存在
  // 即使 action 被删除，历史执行记录仍然保留，确保连续天数计算的真实性
  const { data: allExecutions } = await supabase
    .from('daily_executions')
    .select('date, completed')
    .eq('user_id', user.id)
    .eq('completed', true)
    .order('date', { ascending: false })
    .limit(MAX_CONSECUTIVE_DAYS_QUERY) // 最多查询指定天数的数据，足够计算连续完成天数

  const consecutiveDays = calculateConsecutiveDays(allExecutions || [])

  // 获取最近指定天数的执行反馈数据（用于复盘）
  // 时区处理：使用 ISO 格式确保一致性
  // 注意：复盘数据应该显示当前目标的执行情况，而不是所有目标
  // 如果当前目标已完成或没有当前目标，显示最近一个目标的执行情况
  // 【修复】确保查询范围与显示范围一致：从 REVIEW_DAYS_RANGE - 1 天前到今天（共 REVIEW_DAYS_RANGE 天）
  const reviewDaysAgo = new Date()
  reviewDaysAgo.setDate(reviewDaysAgo.getDate() - (REVIEW_DAYS_RANGE - 1))
  const reviewDaysAgoStr = reviewDaysAgo.toISOString().split('T')[0]

  // 确定要显示的目标ID（当前目标或最近一个目标）
  let targetGoalId: string | null = null
  if (systemState?.current_goal_id) {
    targetGoalId = systemState.current_goal_id
  } else if (goals && goals.length > 0) {
    // 如果没有当前目标，使用最近一个目标
    targetGoalId = goals[0].id
  }

  // 优化：从已获取的数据中提取目标行动ID，避免重复查询
  let targetActionIds: string[] = []
  if (targetGoalId) {
    const targetPhases = phases.filter(p => p.goal_id === targetGoalId)
    if (targetPhases.length > 0) {
      const phaseIds = targetPhases.map(p => p.id)
      targetActionIds = actions
        .filter(a => phaseIds.includes(a.phase_id))
        .map(a => a.id)
    }
  }

  // 明确排序，确保数据顺序一致
  // 注意：只显示当前目标（或最近一个目标）的执行情况
  // 优化：添加 action_id 字段，用于判断今天完成状态
  // 【数据独立性保障】直接查询 daily_executions，不依赖 action 的存在
  // 即使 action 被删除，历史执行记录仍然保留，确保趋势和完成数据的真实性
  // 【重要】查询时不要限制 action_id，因为：
  // 1. 刚完成的 action 可能不在 targetActionIds 中（如果目标已切换）
  // 2. 需要查询所有执行记录来判断今天是否完成
  let recentExecutionsQuery = supabase
    .from('daily_executions')
    .select('date, completed, difficulty, energy, action_id, action_title, goal_name, phase_name')
    .eq('user_id', user.id)
    .gte('date', reviewDaysAgoStr)
  
  // 注意：不在这里限制 targetActionIds，而是在处理数据时过滤
  // 这样可以确保今天完成的记录能被正确识别

  const { data: recentExecutions } = await recentExecutionsQuery.order('date', { ascending: true })

  // 处理最近指定天数的数据，按日期分组
  // 数据结构：每天一条记录，包含完成情况和平均难度/精力
  const dailyStats: DayData[] = []
  const today = new Date()
  
  // 生成最近指定天数的日期数组
  // 注意：使用倒序循环确保即使数据库缺天数，也不会出现 index 越界
  // 因为我们是基于固定日期范围生成数组，而不是基于数据库返回的数据量
  // 【修复】确保日期范围与查询范围一致：从 REVIEW_DAYS_RANGE - 1 天前到今天（共 REVIEW_DAYS_RANGE 天）
  const todayStr = today.toISOString().split('T')[0]
  
  for (let i = REVIEW_DAYS_RANGE - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    // 从查询结果中筛选当天的执行记录
    // 【重要】如果目标已确定，只统计目标内的记录（用于趋势分析）
    // 但今天完成的记录，即使不在目标内，也应该显示（因为"今日已完成"是全局的）
    let dayExecutions = (recentExecutions || []).filter(e => e.date === dateStr)
    
    // 如果目标已确定，且不是今天，只统计目标内的记录
    // 【类型安全】action_id 可能为 null（已删除的 action），需要先检查
    if (targetActionIds.length > 0 && dateStr !== todayStr && targetGoalId) {
      // 获取当前目标名称，用于匹配已删除 action 的记录
      const currentGoal = goals?.find(g => g.id === targetGoalId)
      const currentGoalName = currentGoal?.name
      
      dayExecutions = dayExecutions.filter(e => {
        if (e.action_id === null) {
          // 已删除的 action，根据 goal_name 判断是否属于当前目标
          if (currentGoalName && e.goal_name === currentGoalName) {
            return true
          }
          return false
        }
        return targetActionIds.includes(e.action_id)
      })
    }
    // 如果是今天，保留所有记录（因为"今日已完成"是全局的，不限于目标）
    
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
  // 【重要】应该查询所有今天的完成记录，而不仅仅是目标内的
  // 因为用户可能完成任何目标的行动，都应该算作"今日已完成"
  const { getToday } = await import('@/lib/utils/date')
  const todayStrForCheck = getToday()
  
  const { data: todayExecutions } = await supabase
    .from('daily_executions')
    .select('completed, action_id')
    .eq('user_id', user.id)
    .eq('date', todayStrForCheck)
    .eq('completed', true)
    .limit(1)
  
  const todayCompleted = !!(todayExecutions && todayExecutions.length > 0)

  // 生成智能建议
  const insights = generateInsights({
    goals: goalsWithStats,
    consecutiveDays,
    dailyStats,
    hasCurrentAction,
    todayCompleted,
  })

  // 获取最近指定天数的完成记录（用于历史记录显示）
  // 【数据独立性保障】使用快照字段，不依赖 action 的存在
  // 即使 action 被删除，历史记录仍然完整显示，确保复盘数据的真实性
  let recentExecutionsForHistoryQuery = supabase
    .from('daily_executions')
    .select(`
      id,
      action_id,
      date,
      completed,
      difficulty,
      energy,
      action_title,
      action_definition,
      goal_name,
      phase_name
    `)
    .eq('user_id', user.id)
    .eq('completed', true)
    .order('date', { ascending: false })
    .limit(REVIEW_HISTORY_LIMIT) // 只查询最近指定条数的记录，减少查询量

  // 如果目标已确定，只查询该目标的记录
  // 【重要】不限制 action_id，因为已删除的 action 的 action_id 为 NULL
  // 我们会在应用层过滤，确保只显示当前目标的历史记录
  // 注意：如果限制 action_id，会漏掉已删除 action 的记录
  // 所以不在这里限制，而是在格式化时根据 goal_name 过滤（如果需要）

  const { data: recentExecutionsForHistory } = await recentExecutionsForHistoryQuery

  // 转换数据类型以匹配 ExecutionHistory 接口
  // 使用快照字段构建 action 信息，即使 action 已被删除
  interface ExecutionRecord {
    id: string
    action_id: string | null
    date: string
    completed: boolean
    difficulty: number | null
    energy: number | null
    action_title: string | null
    action_definition: string | null
    goal_name: string | null
    phase_name: string | null
  }
  
  // 【重要】如果目标已确定，过滤出目标内的记录或已删除但 goal_name 匹配的记录
  let filteredHistory = (recentExecutionsForHistory || []) as ExecutionRecord[]
  
  if (targetActionIds.length > 0 && targetGoalId) {
    // 获取当前目标名称，用于匹配已删除 action 的记录
    const currentGoal = goals?.find(g => g.id === targetGoalId)
    const currentGoalName = currentGoal?.name
    
    filteredHistory = filteredHistory.filter(exec => {
      // 如果 action_id 在目标列表中，保留
      if (exec.action_id && targetActionIds.includes(exec.action_id)) {
        return true
      }
      // 如果 action_id 为 NULL（已删除），但 goal_name 匹配当前目标，保留
      if (exec.action_id === null && currentGoalName && exec.goal_name === currentGoalName) {
        return true
      }
      return false
    })
  }
  
  const formattedExecutions = filteredHistory.map((exec: ExecutionRecord) => ({
    id: exec.id,
    action_id: exec.action_id || '',
    date: exec.date,
    completed: exec.completed,
    difficulty: exec.difficulty,
    energy: exec.energy,
    actions: {
      id: exec.action_id || 'deleted',
      title: exec.action_title || '已删除',
      definition: exec.action_definition || '',
      phases: {
        id: 'deleted',
        name: exec.phase_name || '已删除',
        goals: {
          id: 'deleted',
          name: exec.goal_name || '已删除',
        },
      },
    },
  }))

  return (
    <DashboardView
      goals={goalsWithStats}
      consecutiveDays={consecutiveDays}
      dailyStats={dailyStats}
      hasCurrentAction={hasCurrentAction}
      todayCompleted={todayCompleted}
      insights={insights}
      recentExecutions={formattedExecutions}
    />
  )
}

