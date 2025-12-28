/**
 * 提醒/通知系统
 * 帮助用户记住每日行动，提高完成率
 */

/**
 * 请求浏览器通知权限
 * @returns {Promise<{success: boolean, message: string}>} 返回请求结果和消息
 */
export async function requestNotificationPermission(): Promise<{success: boolean, message: string}> {
  if (!('Notification' in window)) {
    return {
      success: false,
      message: '此浏览器不支持通知功能，请使用现代浏览器（Chrome、Firefox、Edge等）'
    }
  }

  // 如果权限已经授予
  if (Notification.permission === 'granted') {
    return {
      success: true,
      message: '通知权限已授予'
    }
  }

  // 如果权限被拒绝，需要用户在浏览器设置中手动启用
  if (Notification.permission === 'denied') {
    return {
      success: false,
      message: '通知权限已被拒绝。请在浏览器设置中手动启用：\n1. 点击地址栏左侧的锁图标或信息图标\n2. 找到"通知"选项\n3. 选择"允许"或"询问"'
    }
  }

  // 权限状态为 'default'，可以请求
  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      return {
        success: true,
        message: '通知权限已授予'
      }
    } else if (permission === 'denied') {
      return {
        success: false,
        message: '通知权限被拒绝。请在浏览器设置中手动启用'
      }
    } else {
      return {
        success: false,
        message: '通知权限请求被取消'
      }
    }
  } catch (error) {
    console.error('请求通知权限失败:', error)
    return {
      success: false,
      message: '请求通知权限时发生错误，请重试'
    }
  }
}

/**
 * 发送通知
 */
export function sendNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return
  }

  try {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    })
  } catch (error) {
    console.error('发送通知失败:', error)
  }
}

/**
 * 发送每日行动提醒
 */
export function sendDailyActionReminder(actionTitle: string, actionDefinition: string) {
  sendNotification('📋 今日行动待完成', {
    body: `${actionTitle}\n${actionDefinition}`,
    tag: 'daily-action-reminder',
    requireInteraction: false,
  })
}

/**
 * 发送完成提醒（如果今天还没完成）
 */
export function sendCompletionReminder() {
  sendNotification('⏰ 提醒：今天还没完成行动', {
    body: '快去完成今日行动，保持连续记录！',
    tag: 'completion-reminder',
    requireInteraction: false,
  })
}

/**
 * 发送完成庆祝通知
 */
export function sendCompletionCelebration(isGoalCompleted: boolean = false) {
  if (isGoalCompleted) {
    sendNotification('🎉 目标已完成！', {
      body: '恭喜你坚持完成了这个目标！',
      tag: 'goal-completed',
      requireInteraction: false,
    })
  } else {
    sendNotification('✅ 今日行动已完成！', {
      body: '继续保持这个节奏！',
      tag: 'action-completed',
      requireInteraction: false,
    })
  }
}

/**
 * 检查并设置每日提醒
 * @deprecated 使用 lib/reminder-manager.ts 中的 setupDailyReminder
 */
export async function setupDailyReminder(
  reminderTime: string, // 格式: "09:00"
  actionTitle: string,
  actionDefinition: string
) {
  // 检查权限
  const result = await requestNotificationPermission()
  if (!result.success) {
    return false
  }

  // 使用提醒管理器
  const { setupDailyReminder: setupDaily } = await import('./reminder-manager')
  return setupDaily(reminderTime, actionTitle, actionDefinition)
}

/**
 * 清除所有提醒
 * @deprecated 使用 lib/reminder-manager.ts 中的 clearAllReminders
 */
export function clearAllReminders() {
  // 使用提醒管理器
  import('./reminder-manager').then(({ clearAllReminders: clearAll }) => {
    clearAll()
  })
}

