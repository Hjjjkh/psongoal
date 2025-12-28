/**
 * 统计工具函数
 * 统一处理各种统计计算，确保逻辑一致性和时区一致性
 */

import { getToday } from './date'

/**
 * 计算连续完成天数
 * 
 * 规则：
 * 1. 从今天或昨天开始往前计算连续完成天数
 * 2. 如果今天已完成，从今天开始计算
 * 3. 如果今天未完成，从昨天开始计算
 * 4. 使用 UTC 时区确保跨时区一致性
 * 
 * @param executions - 执行记录数组，包含 date 和 completed 字段
 * @returns 连续完成天数
 */
export function calculateConsecutiveDays(
  executions: Array<{ date: string; completed: boolean }>
): number {
  if (!executions || executions.length === 0) {
    return 0
  }

  // 按日期去重，获取所有有完成记录的日期
  const dateMap: Record<string, boolean> = {}
  for (const e of executions) {
    if (e.completed === true && e.date && typeof e.date === 'string') {
      dateMap[e.date] = true
    }
  }

  // 获取所有日期并排序（从新到旧）
  const sortedDates = Object.keys(dateMap).sort().reverse()

  if (sortedDates.length === 0) {
    return 0
  }

  // 使用统一的日期工具函数获取今天（UTC时区）
  const today = getToday()
  const todayDate = new Date(today + 'T00:00:00Z') // UTC 日期

  // 检查今天是否有完成记录
  const todayHasCompletion = dateMap[today] === true

  // 从今天或昨天开始计算（如果今天没有完成，从昨天开始）
  let checkDate = new Date(todayDate)
  if (!todayHasCompletion) {
    checkDate.setUTCDate(checkDate.getUTCDate() - 1)
  }

  let consecutiveDays = 0

  // 连续往前检查，直到找到没有完成记录的一天
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0]

    if (dateMap[dateStr] === true) {
      consecutiveDays++
      checkDate.setUTCDate(checkDate.getUTCDate() - 1)
    } else {
      break
    }
  }

  return consecutiveDays
}

