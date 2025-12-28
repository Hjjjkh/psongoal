'use client'

import { useEffect, useRef } from 'react'
import { setupDailyReminder, setupCompletionReminder, clearAllReminders, clearDailyReminder, clearCompletionReminder } from '@/lib/reminder-manager'
import { requestNotificationPermission } from '@/lib/notifications'

interface UseReminderOptions {
  enabled: boolean | null
  reminderTime: string | null
  actionTitle?: string
  actionDefinition?: string
  todayCompleted: boolean
  hasCurrentAction: boolean
}

/**
 * 提醒功能 Hook
 * 自动设置每日提醒和完成提醒
 */
export function useReminder({
  enabled,
  reminderTime,
  actionTitle,
  actionDefinition,
  todayCompleted,
  hasCurrentAction,
}: UseReminderOptions) {
  const reminderSetupRef = useRef(false)
  const completionReminderSetupRef = useRef(false)

  // 清理函数：当组件卸载或依赖变化时清除旧提醒
  useEffect(() => {
    return () => {
      // 组件卸载时清除所有提醒
      clearAllReminders()
      reminderSetupRef.current = false
      completionReminderSetupRef.current = false
    }
  }, [])

  // 设置每日提醒
  useEffect(() => {
    // 如果提醒未启用，清除提醒
    if (!enabled || !reminderTime) {
      clearDailyReminder()
      reminderSetupRef.current = false
      return
    }

    // 如果今天已完成，清除提醒
    if (todayCompleted) {
      clearDailyReminder()
      reminderSetupRef.current = false
      return
    }

    // 如果没有当前行动，清除提醒
    if (!hasCurrentAction || !actionTitle || !actionDefinition) {
      clearDailyReminder()
      reminderSetupRef.current = false
      return
    }

    // 检查通知权限
    requestNotificationPermission().then((result) => {
      const hasPermission = typeof result === 'boolean' ? result : result.success
      if (!hasPermission) {
        console.warn('通知权限未授予，无法设置提醒')
        return
      }

      // 清除旧的提醒，设置新的
      clearDailyReminder()
      reminderSetupRef.current = false

      // 设置每日提醒
      const success = setupDailyReminder(reminderTime, actionTitle, actionDefinition)
      if (success) {
        reminderSetupRef.current = true
      }
    })
  }, [enabled, reminderTime, actionTitle, actionDefinition, todayCompleted, hasCurrentAction])

  // 设置完成提醒（如果今天还没完成）
  useEffect(() => {
    // 如果提醒未启用，清除完成提醒
    if (!enabled) {
      clearCompletionReminder()
      completionReminderSetupRef.current = false
      return
    }

    // 如果今天已完成，清除完成提醒
    if (todayCompleted) {
      clearCompletionReminder()
      completionReminderSetupRef.current = false
      return
    }

    // 如果没有当前行动，清除完成提醒
    if (!hasCurrentAction) {
      clearCompletionReminder()
      completionReminderSetupRef.current = false
      return
    }

    // 检查通知权限
    requestNotificationPermission().then((result) => {
      const hasPermission = typeof result === 'boolean' ? result : result.success
      if (!hasPermission) {
        return
      }

      // 清除旧的完成提醒，设置新的
      clearCompletionReminder()
      completionReminderSetupRef.current = false

      // 在下午6点检查，如果还没完成，发送提醒
      const success = setupCompletionReminder('18:00')
      if (success) {
        completionReminderSetupRef.current = true
      }
    })
  }, [enabled, todayCompleted, hasCurrentAction])
}

