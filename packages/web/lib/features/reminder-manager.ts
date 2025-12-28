/**
 * 提醒管理器
 * 管理所有提醒定时器，支持清除和重新设置
 */

interface ReminderTimer {
  id: NodeJS.Timeout
  type: 'daily' | 'completion' | 'goal-completion'
}

class ReminderManager {
  private timers: Map<string, ReminderTimer> = new Map()
  private dailyIntervalId: NodeJS.Timeout | null = null

  /**
   * 设置每日提醒
   */
  setupDailyReminder(
    reminderTime: string,
    actionTitle: string,
    actionDefinition: string
  ): boolean {
    // 清除旧的每日提醒
    this.clearDailyReminder()

    // 计算下次提醒时间
    const [hours, minutes] = reminderTime.split(':').map(Number)
    const now = new Date()
    const reminderDate = new Date()
    reminderDate.setHours(hours, minutes, 0, 0)

    // 如果今天的时间已过，设置为明天
    if (reminderDate <= now) {
      reminderDate.setDate(reminderDate.getDate() + 1)
    }

    const timeUntilReminder = reminderDate.getTime() - now.getTime()

    // 设置第一次提醒
    const firstReminderId = setTimeout(() => {
      this.sendDailyReminder(actionTitle, actionDefinition)
      
      // 设置每日重复
      this.dailyIntervalId = setInterval(() => {
        this.sendDailyReminder(actionTitle, actionDefinition)
      }, 24 * 60 * 60 * 1000) // 24小时
    }, timeUntilReminder)

    this.timers.set('daily-first', { id: firstReminderId, type: 'daily' })

    return true
  }

  /**
   * 发送每日提醒
   */
  private sendDailyReminder(actionTitle: string, actionDefinition: string) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return
    }

    try {
      new Notification('📋 今日行动待完成', {
        body: `${actionTitle}\n${actionDefinition}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'daily-action-reminder',
        requireInteraction: false,
      })
    } catch (error) {
      console.error('发送提醒失败:', error)
    }
  }

  /**
   * 设置完成提醒（如果今天还没完成）
   */
  setupCompletionReminder(checkTime: string = '18:00'): boolean {
    // 清除旧的完成提醒
    this.clearCompletionReminder()

    const [hours, minutes] = checkTime.split(':').map(Number)
    const now = new Date()
    const checkDate = new Date()
    checkDate.setHours(hours, minutes, 0, 0)

    // 如果已经过了检查时间，设置为明天
    if (checkDate <= now) {
      checkDate.setDate(checkDate.getDate() + 1)
    }

    const timeUntilCheck = checkDate.getTime() - now.getTime()

    const completionReminderId = setTimeout(() => {
      this.sendCompletionReminder()
    }, timeUntilCheck)

    this.timers.set('completion', { id: completionReminderId, type: 'completion' })

    return true
  }

  /**
   * 发送完成提醒
   */
  private sendCompletionReminder() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return
    }

    try {
      new Notification('⏰ 提醒：今天还没完成行动', {
        body: '快去完成今日行动，保持连续记录！',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'completion-reminder',
        requireInteraction: false,
      })
    } catch (error) {
      console.error('发送完成提醒失败:', error)
    }
  }

  /**
   * 清除每日提醒
   */
  clearDailyReminder() {
    // 清除第一次提醒定时器
    const firstTimer = this.timers.get('daily-first')
    if (firstTimer) {
      clearTimeout(firstTimer.id)
      this.timers.delete('daily-first')
    }

    // 清除每日重复定时器
    if (this.dailyIntervalId) {
      clearInterval(this.dailyIntervalId)
      this.dailyIntervalId = null
    }
  }

  /**
   * 清除完成提醒
   */
  clearCompletionReminder() {
    const completionTimer = this.timers.get('completion')
    if (completionTimer) {
      clearTimeout(completionTimer.id)
      this.timers.delete('completion')
    }
  }

  /**
   * 发送目标完成提醒（一次性，在目标完成时调用）
   */
  sendGoalCompletionReminder(goalName: string) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return
    }

    try {
      new Notification('🎉 恭喜！目标已完成', {
        body: `目标"${goalName}"已完成，快去设置新目标吧！`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'goal-completion-reminder',
        requireInteraction: true,
      })
    } catch (error) {
      console.error('发送目标完成提醒失败:', error)
    }
  }

  /**
   * 清除所有提醒
   */
  clearAllReminders() {
    // 清除所有定时器
    this.timers.forEach((timer) => {
      clearTimeout(timer.id)
    })
    this.timers.clear()

    // 清除每日重复定时器
    if (this.dailyIntervalId) {
      clearInterval(this.dailyIntervalId)
      this.dailyIntervalId = null
    }
  }

  /**
   * 检查是否有活动的提醒
   */
  hasActiveReminders(): boolean {
    return this.timers.size > 0 || this.dailyIntervalId !== null
  }
}

// 单例模式
let reminderManagerInstance: ReminderManager | null = null

export function getReminderManager(): ReminderManager {
  if (!reminderManagerInstance) {
    reminderManagerInstance = new ReminderManager()
  }
  return reminderManagerInstance
}

// 导出便捷函数
export function setupDailyReminder(
  reminderTime: string,
  actionTitle: string,
  actionDefinition: string
): boolean {
  return getReminderManager().setupDailyReminder(reminderTime, actionTitle, actionDefinition)
}

export function setupCompletionReminder(checkTime?: string): boolean {
  return getReminderManager().setupCompletionReminder(checkTime)
}

export function clearAllReminders() {
  getReminderManager().clearAllReminders()
}

export function clearDailyReminder() {
  getReminderManager().clearDailyReminder()
}

export function clearCompletionReminder() {
  getReminderManager().clearCompletionReminder()
}

export function sendGoalCompletionReminder(goalName: string) {
  getReminderManager().sendGoalCompletionReminder(goalName)
}

