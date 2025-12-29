'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Goal, Phase, Action } from '@/lib/types'

interface TodaySyncData {
  goal: Goal | null
  phase: Phase | null
  action: Action | null
  todayCompleted: boolean
  goalProgress: { total: number; completed: number; percentage: number } | null
  remainingActions: number
  consecutiveDays: number
}

/**
 * 使用 Supabase Realtime 自动同步今日行动数据
 * 当数据变化时，自动刷新页面以获取最新数据
 */
export function useTodaySync(initialData: TodaySyncData) {
  const [data, setData] = useState<TodaySyncData>(initialData)
  const [isSyncing, setIsSyncing] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // 刷新今日数据 - 使用 router.refresh() 重新获取服务端数据
  const refreshToday = useCallback(async () => {
    setIsSyncing(true)
    try {
      // 使用 router.refresh() 重新获取服务端渲染的数据
      router.refresh()
      // 延迟重置状态，给页面刷新一些时间
      setTimeout(() => setIsSyncing(false), 500)
    } catch (error) {
      console.error('刷新今日数据失败:', error)
      setIsSyncing(false)
    }
  }, [router])

  // 设置实时订阅
  useEffect(() => {
    let mounted = true
    let systemStateChannel: ReturnType<typeof supabase.channel> | null = null
    let executionsChannel: ReturnType<typeof supabase.channel> | null = null
    let actionsChannel: ReturnType<typeof supabase.channel> | null = null
    const timeouts: NodeJS.Timeout[] = []

    const setupSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return

      // 订阅系统状态变化
      systemStateChannel = supabase
        .channel(`system-state-changes-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'system_states',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            if (!mounted) return
            console.log('系统状态变化，刷新今日数据')
            const timeout = setTimeout(() => {
              if (mounted) refreshToday()
            }, 300)
            timeouts.push(timeout)
          }
        )
        .subscribe()

      // 订阅 daily_executions 变化（完成状态）
      executionsChannel = supabase
        .channel(`executions-changes-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'daily_executions',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            if (!mounted) return
            console.log('执行记录变化，刷新今日数据')
            const timeout = setTimeout(() => {
              if (mounted) refreshToday()
            }, 300)
            timeouts.push(timeout)
          }
        )
        .subscribe()

      // 订阅 actions 变化
      actionsChannel = supabase
        .channel(`today-actions-changes-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'actions',
          },
          () => {
            if (!mounted) return
            const timeout = setTimeout(() => {
              if (mounted) refreshToday()
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
      if (systemStateChannel) supabase.removeChannel(systemStateChannel)
      if (executionsChannel) supabase.removeChannel(executionsChannel)
      if (actionsChannel) supabase.removeChannel(actionsChannel)
    }
  }, [supabase, refreshToday])

  // 当初始数据变化时更新
  useEffect(() => {
    setData(initialData)
  }, [initialData])

  return {
    data,
    setData,
    refreshToday,
    isSyncing,
  }
}

