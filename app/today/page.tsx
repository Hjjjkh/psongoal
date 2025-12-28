import { createClient } from '@/lib/supabase/server'
import { getSystemState, initSystemState, getNextAction, updateSystemState } from '@/lib/system-state'
import { getToday } from '@/lib/utils/date'
import { calculateConsecutiveDays } from '@/lib/utils/stats'
import type { Goal, Phase, Action } from '@/lib/core/types'
import dynamic from 'next/dynamic'

import LoadingSpinner from '@/components/loading-spinner'

// 动态导入 TodayView，优化初始加载
const TodayView = dynamic(() => import('@/components/today-view'), {
  loading: () => <LoadingSpinner message="加载今日行动..." />,
})

export default async function TodayPage() {
  const supabase = await createClient()
  
  // 假设：能进来 = 一定登录了（middleware 已经处理了认证）
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    // 理论上不应该到达这里，但如果到达了，返回错误状态
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">认证错误</p>
          <p className="text-muted-foreground">请刷新页面</p>
        </div>
      </div>
    )
  }

  // 初始化或获取系统状态
  let systemState = await getSystemState(user.id)
  if (!systemState) {
    systemState = await initSystemState(user.id)
  }

  // 【执行力强化】系统异常状态：使用系统语言，而非错误语言
  if (!systemState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">系统状态异常</p>
          <p className="text-muted-foreground">执行被暂停，请刷新页面</p>
        </div>
      </div>
    )
  }

  // 检查用户是否有任何目标（用于新用户引导）
  const { data: userGoals } = await supabase
    .from('goals')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  const hasAnyGoals = !!(userGoals && userGoals.length > 0)

  // 【执行力强化】只获取当前 Action 数据，不查询 execution
  // 所有"是否允许完成"的判断交由后端 API 和 SystemState 处理
  let goal: Goal | null = null
  let phase: Phase | null = null
  let action: Action | null = null

  if (systemState.current_action_id) {
    // 【每日唯一行动约束】检查今天是否已经完成过行动（使用统一的日期工具函数）
    // 【数据独立性保障】直接查询 daily_executions，不依赖 action 的存在
    const today = getToday()
    const { data: todayExecutions } = await supabase
      .from('daily_executions')
      .select('action_id, completed')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('completed', true)
      .limit(1)

    // 如果今天已经完成过行动，不显示当前行动，而是显示完成提示
    if (todayExecutions && todayExecutions.length > 0) {
      // 今天已完成，显示完成提示
      // 检查目标是否已完成
      const { data: goalData } = await supabase
        .from('goals')
        .select('*')
        .eq('id', systemState.current_goal_id)
        .single()

      return (
        <TodayView
          goal={goalData}
          phase={null}
          action={null}
          hasCurrentAction={false}
          hasAnyGoals={hasAnyGoals}
          goalProgress={null}
          remainingActions={0}
          consecutiveDays={0}
        />
      )
    }

    // 【自动推进逻辑】如果当前行动已完成，且今天没有完成记录，自动推进到下一个行动
    // 这处理了"昨天完成，今天应该显示下一个行动"的情况
    const { data: currentActionCheck } = await supabase
      .from('actions')
      .select('completed_at, id, phase_id')
      .eq('id', systemState.current_action_id)
      .single()

    if (currentActionCheck?.completed_at) {
      // 当前行动已完成，检查是否有下一个行动
      const nextAction = await getNextAction(user.id, currentActionCheck.id)
      if (nextAction) {
        // 有下一个行动，自动推进（这是新的一天，应该显示下一个行动）
        await updateSystemState(user.id, {
          current_action_id: nextAction.id,
          current_phase_id: nextAction.phase_id,
          current_goal_id: systemState.current_goal_id,
        })
        // 更新 systemState 以便后续使用
        systemState.current_action_id = nextAction.id
        systemState.current_phase_id = nextAction.phase_id
        // 继续获取下一个行动的数据（重新查询以获取完整信息）
        const { data: nextActionData } = await supabase
          .from('actions')
          .select(`
            *,
            phases!inner(
              *,
              goals!inner(*)
            )
          `)
          .eq('id', nextAction.id)
          .single()

        if (nextActionData) {
          action = {
            id: nextActionData.id,
            phase_id: nextActionData.phase_id,
            title: nextActionData.title,
            definition: nextActionData.definition,
            estimated_time: nextActionData.estimated_time,
            order_index: nextActionData.order_index,
            completed_at: nextActionData.completed_at,
            created_at: nextActionData.created_at,
          }
          phase = nextActionData.phases
          goal = nextActionData.phases.goals
          
          // 计算目标进度和剩余行动数（与后续逻辑保持一致）
          let goalProgress = null
          let remainingActions = 0
          
          if (goal && systemState.current_goal_id) {
            const { data: goalPhases } = await supabase
              .from('phases')
              .select('id')
              .eq('goal_id', goal.id)

            if (goalPhases && goalPhases.length > 0) {
              const phaseIds = goalPhases.map((p: { id: string }) => p.id)
              const { data: allActions } = await supabase
                .from('actions')
                .select('id, completed_at, order_index')
                .in('phase_id', phaseIds)

              if (allActions && action) {
                const totalActions = allActions.length
                const completedActions = allActions.filter((a: { completed_at: string | null }) => a.completed_at).length
                const currentActionIndex = allActions.findIndex((a: { id: string }) => a.id === action!.id)
                
                goalProgress = {
                  total: totalActions,
                  completed: completedActions,
                  percentage: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
                }
                remainingActions = currentActionIndex >= 0 ? totalActions - currentActionIndex - 1 : totalActions - completedActions
              }
            }
          }
          
          // 计算连续完成天数（使用统一的统计函数）
          // 【数据独立性保障】直接查询 daily_executions，不依赖 action 的存在
          // 即使 action 被删除，历史执行记录仍然保留，确保连续天数计算的真实性
          const { data: recentExecutions } = await supabase
            .from('daily_executions')
            .select('date, completed')
            .eq('user_id', user.id)
            .eq('completed', true)
            .order('date', { ascending: false })
            .limit(365)

          const consecutiveDays = calculateConsecutiveDays(recentExecutions || [])
          
          // 检查今天是否已完成（使用统一的日期工具函数）
          // 【数据独立性保障】直接查询 daily_executions，不依赖 action 的存在
          const today = getToday()
          const { data: todayExecutionsData } = await supabase
            .from('daily_executions')
            .select('action_id, completed')
            .eq('user_id', user.id)
            .eq('date', today)
            .eq('completed', true)
            .limit(1)
          
          const todayCompleted = !!(todayExecutionsData && todayExecutionsData.length > 0)
          
          // 直接返回，不再继续执行后续逻辑
          return (
            <TodayView
              goal={goal}
              phase={phase}
              action={action}
              hasCurrentAction={true}
              hasAnyGoals={hasAnyGoals}
              needsPhase={false}
              needsAction={false}
              goalProgress={goalProgress}
              remainingActions={remainingActions}
              consecutiveDays={consecutiveDays}
              reminderEnabled={systemState.reminder_enabled}
              reminderTime={systemState.reminder_time}
              todayCompleted={todayCompleted}
            />
          )
        }
      } else {
        // 没有下一个行动，目标已完成
        await updateSystemState(user.id, {
          current_action_id: null,
        })
        const { data: goalData } = await supabase
          .from('goals')
          .select('*')
          .eq('id', systemState.current_goal_id)
          .single()

        return (
          <TodayView
            goal={goalData}
            phase={null}
            action={null}
            hasCurrentAction={false}
            hasAnyGoals={hasAnyGoals}
            goalProgress={null}
            remainingActions={0}
            consecutiveDays={0}
          />
        )
      }
    }

    // 获取 Action 及其关联数据
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

    if (!actionData) {
      // 系统状态指向的行动不存在，可能是目标没有行动
      // 获取当前目标信息用于显示提示
      if (systemState.current_goal_id) {
        const { data: currentGoal } = await supabase
          .from('goals')
          .select('*')
          .eq('id', systemState.current_goal_id)
          .single()
        
        if (currentGoal) {
          // 检查目标是否有阶段和行动
          const { data: phases } = await supabase
            .from('phases')
            .select('id')
            .eq('goal_id', currentGoal.id)
            .limit(1)
          
          if (!phases || phases.length === 0) {
            // 目标没有阶段，需要创建阶段
            return (
              <TodayView
                goal={currentGoal}
                phase={null}
                action={null}
                hasCurrentAction={false}
                hasAnyGoals={hasAnyGoals}
                needsPhase={true}
                goalProgress={null}
                remainingActions={0}
                consecutiveDays={0}
              />
            )
          } else {
            // 目标有阶段但没有行动，需要创建行动
            return (
              <TodayView
                goal={currentGoal}
                phase={null}
                action={null}
                hasCurrentAction={false}
                hasAnyGoals={hasAnyGoals}
                needsAction={true}
                goalProgress={null}
                remainingActions={0}
                consecutiveDays={0}
              />
            )
          }
        }
      }
      // 如果无法获取目标信息，显示系统异常
      return (
        <TodayView
          goal={null}
          phase={null}
          action={null}
          hasCurrentAction={false}
          hasAnyGoals={hasAnyGoals}
          goalProgress={null}
          remainingActions={0}
          consecutiveDays={0}
        />
      )
    }

    if (actionData) {
      // 正常情况：行动未完成，可以显示
      // 注意：如果行动已完成，应该已经在之前的自动推进逻辑中处理了
      // 如果到达这里，说明行动未完成，可以正常显示
      action = {
        id: actionData.id,
        phase_id: actionData.phase_id,
        title: actionData.title,
        definition: actionData.definition,
        estimated_time: actionData.estimated_time,
        order_index: actionData.order_index,
        completed_at: actionData.completed_at,
        created_at: actionData.created_at,
      }
      phase = actionData.phases
      goal = actionData.phases.goals
    }
  }

  // 并行计算目标进度、连续完成天数和今天完成状态（优化性能）
  // 使用统一的日期工具函数
  const today = getToday()
  
  let goalProgress = null
  let remainingActions = 0
  let consecutiveDays = 0
  let todayCompleted = false

  // 并行执行所有查询
  const [
    goalProgressData,
    consecutiveDaysData,
    todayExecutionsData
  ] = await Promise.all([
    // 计算目标进度（仅在有效目标时）
    goal && systemState.current_goal_id ? (async () => {
      const { data: goalPhases } = await supabase
        .from('phases')
        .select('id')
        .eq('goal_id', goal.id)

      if (goalPhases && goalPhases.length > 0) {
        const phaseIds = goalPhases.map((p: { id: string }) => p.id)
        const { data: allActions } = await supabase
          .from('actions')
          .select('id, completed_at, order_index')
          .in('phase_id', phaseIds)

        if (allActions) {
          const totalActions = allActions.length
          const completedActions = allActions.filter((a: { completed_at: string | null }) => a.completed_at).length
          const currentActionIndex = action ? allActions.findIndex((a: { id: string }) => a.id === action.id) : -1
          
          return {
            total: totalActions,
            completed: completedActions,
            percentage: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
            remaining: currentActionIndex >= 0 ? totalActions - currentActionIndex - 1 : totalActions - completedActions
          }
        }
      }
      return null
    })() : Promise.resolve(null),
    
    // 计算连续完成天数（使用统一的统计函数）
    // 【数据独立性保障】直接查询 daily_executions，不依赖 action 的存在
    // 即使 action 被删除，历史执行记录仍然保留，确保连续天数计算的真实性
    (async () => {
      const { data: recentExecutions } = await supabase
        .from('daily_executions')
        .select('date, completed')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('date', { ascending: false })
        .limit(365) // 【产品功能】保持365天查询，确保连续天数计算准确

      return calculateConsecutiveDays(recentExecutions || [])
    })(),
    
    // 检查今天是否已完成（使用统一的日期工具函数）
    // 【数据独立性保障】直接查询 daily_executions，不依赖 action 的存在
    (async () => {
      const today = getToday()
      const { data } = await supabase
        .from('daily_executions')
        .select('action_id, completed')
        .eq('user_id', user.id)
        .eq('date', today)
        .eq('completed', true)
        .limit(1)
      return !!(data && data.length > 0)
    })()
  ])

  if (goalProgressData) {
    goalProgress = {
      total: goalProgressData.total,
      completed: goalProgressData.completed,
      percentage: goalProgressData.percentage,
    }
    remainingActions = goalProgressData.remaining
  }
  consecutiveDays = consecutiveDaysData || 0
  todayCompleted = todayExecutionsData || false

  // 【执行力强化】传递 systemState.current_action_id 用于状态判断
  // 如果为 null，表示目标已完成或未设置
  return (
    <TodayView
      goal={goal}
      phase={phase}
      action={action}
      hasCurrentAction={systemState.current_action_id !== null}
      hasAnyGoals={hasAnyGoals}
      needsPhase={false}
      needsAction={false}
      goalProgress={goalProgress}
      remainingActions={remainingActions}
      consecutiveDays={consecutiveDays}
      reminderEnabled={systemState.reminder_enabled}
      reminderTime={systemState.reminder_time}
      todayCompleted={todayCompleted}
    />
  )
}

