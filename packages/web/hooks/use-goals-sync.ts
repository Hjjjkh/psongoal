'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Goal, Phase, Action } from '@/lib/types'

interface GoalWithDetails extends Goal {
  phases: (Phase & { actions: Action[] })[]
}

/**
 * 使用 Supabase Realtime 自动同步目标数据
 * 当数据库中的数据发生变化时，自动更新本地状态
 */
export function useGoalsSync(initialGoals: GoalWithDetails[]) {
  const [goals, setGoals] = useState<GoalWithDetails[]>(initialGoals)
  const [isSyncing, setIsSyncing] = useState(false)
  const supabase = createClient()

  // 从服务器重新获取完整数据（用于确保数据一致性）
  const refreshGoals = useCallback(async () => {
    setIsSyncing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 获取所有 Goals（不限制数量，确保加载所有数据）
      // 如果将来数据量很大，可以考虑实现分页加载
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!goalsData || goalsData.length === 0) {
        setGoals([])
        return
      }

      // 批量获取 phases 和 actions
      const goalIds = goalsData.map(g => g.id)
      
      const { data: allPhases } = await supabase
        .from('phases')
        .select('*')
        .in('goal_id', goalIds)
        .order('order_index', { ascending: true })

      const phases = allPhases || []
      const phaseIds = phases.map(p => p.id)

      const { data: allActions } = phaseIds.length > 0
        ? await supabase
            .from('actions')
            .select('*')
            .in('phase_id', phaseIds)
            .order('order_index', { ascending: true })
        : { data: [] }

      const actions = allActions || []

      // 组织数据
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

      const goalsWithDetails = goalsData.map(goal => {
        const goalPhases = phasesByGoal.get(goal.id) || []
        const phasesWithActions = goalPhases.map(phase => ({
          ...phase,
          actions: actionsByPhase.get(phase.id) || []
        }))
        return { ...goal, phases: phasesWithActions }
      })

      setGoals(goalsWithDetails)
    } catch (error) {
      console.error('刷新目标数据失败:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [supabase])

  // 设置 Supabase Realtime 订阅
  useEffect(() => {
    let mounted = true
    let goalsChannel: ReturnType<typeof supabase.channel> | null = null
    let phasesChannel: ReturnType<typeof supabase.channel> | null = null
    let actionsChannel: ReturnType<typeof supabase.channel> | null = null
    const timeouts: NodeJS.Timeout[] = []

    const setupSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return

      // 订阅 goals 表的变化
      goalsChannel = supabase
        .channel(`goals-changes-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'goals',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!mounted) return
            console.log('Goals 数据变化:', payload.eventType)
            // 延迟刷新，避免频繁更新
            const timeout = setTimeout(() => {
              if (mounted) refreshGoals()
            }, 300)
            timeouts.push(timeout)
          }
        )
        .subscribe()

      // 订阅 phases 表的变化
      phasesChannel = supabase
        .channel(`phases-changes-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'phases',
          },
          (payload) => {
            if (!mounted) return
            console.log('Phases 数据变化:', payload.eventType)
            const timeout = setTimeout(() => {
              if (mounted) refreshGoals()
            }, 300)
            timeouts.push(timeout)
          }
        )
        .subscribe()

      // 订阅 actions 表的变化
      actionsChannel = supabase
        .channel(`actions-changes-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'actions',
          },
          (payload) => {
            if (!mounted) return
            console.log('Actions 数据变化:', payload.eventType)
            const timeout = setTimeout(() => {
              if (mounted) refreshGoals()
            }, 300)
            timeouts.push(timeout)
          }
        )
        .subscribe()
    }

    setupSubscriptions()

    // 清理订阅和定时器
    return () => {
      mounted = false
      timeouts.forEach(timeout => clearTimeout(timeout))
      if (goalsChannel) supabase.removeChannel(goalsChannel)
      if (phasesChannel) supabase.removeChannel(phasesChannel)
      if (actionsChannel) supabase.removeChannel(actionsChannel)
    }
  }, [supabase, refreshGoals])

  // 当初始数据变化时，更新本地状态
  useEffect(() => {
    setGoals(initialGoals)
  }, [initialGoals])

  return {
    goals,
    setGoals,
    refreshGoals,
    isSyncing,
  }
}

