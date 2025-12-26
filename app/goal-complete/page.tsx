import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSystemState } from '@/lib/system-state'
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

  // 获取连续完成天数（跨目标）
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
    <GoalCelebrationView
      goal={goal}
      totalActions={totalActions}
      completedActions={completedActions}
      startDate={goal.start_date}
      endDate={goal.end_date}
      consecutiveDays={consecutiveDays}
    />
  )
}

