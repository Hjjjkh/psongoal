/**
 * 工具函数
 * 纯业务逻辑，不依赖具体实现
 */

/**
 * 获取今天的日期字符串（YYYY-MM-DD）
 */
export function getToday(): string {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

/**
 * 计算连续完成天数
 * @param executions 执行记录数组，按日期倒序排列
 */
export function calculateConsecutiveDays(
  executions: Array<{ date: string; completed: boolean }>
): number {
  if (executions.length === 0) return 0

  // 按日期倒序排列（最新的在前）
  const sorted = [...executions]
    .filter(e => e.completed)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (sorted.length === 0) return 0

  const today = getToday()
  let consecutiveDays = 0
  let expectedDate = today

  for (const execution of sorted) {
    if (execution.date === expectedDate) {
      consecutiveDays++
      // 计算前一天
      const date = new Date(expectedDate)
      date.setDate(date.getDate() - 1)
      expectedDate = date.toISOString().split('T')[0]
    } else {
      // 如果日期不连续，停止计数
      break
    }
  }

  return consecutiveDays
}

