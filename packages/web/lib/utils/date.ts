/**
 * 日期格式化工具函数
 */

/**
 * 格式化日期为 YYYY-MM-DD 格式（用于数据库查询）
 */
export function formatDateForQuery(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * 格式化日期为输入框格式（YYYY-MM-DD）
 * 用于 HTML date input 的 value 属性
 */
export function formatDateForInput(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDateForQuery(dateObj)
}

/**
 * 格式化日期为中文显示格式
 */
export function formatDateForDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  })
}

/**
 * 格式化日期为简短显示格式（MM/DD）
 */
export function formatDateShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const month = dateObj.getMonth() + 1
  const day = dateObj.getDate()
  return `${month}/${day}`
}

/**
 * 判断日期是否是今天
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(dateObj)
  compareDate.setHours(0, 0, 0, 0)
  return compareDate.getTime() === today.getTime()
}

/**
 * 判断日期是否是昨天
 */
export function isYesterday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const compareDate = new Date(dateObj)
  compareDate.setHours(0, 0, 0, 0)
  return compareDate.getTime() === yesterday.getTime()
}

/**
 * 获取今天的日期字符串（YYYY-MM-DD）
 * 用于日期输入框的默认值
 */
export function getToday(): string {
  return formatDateForQuery(new Date())
}

/**
 * 获取今天的日期字符串（YYYY-MM-DD）
 * @deprecated 使用 getToday() 代替
 */
export function getTodayString(): string {
  return getToday()
}

/**
 * 获取明天的日期字符串（YYYY-MM-DD）
 */
export function getTomorrow(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return formatDateForQuery(tomorrow)
}

/**
 * 获取本周开始日期（周一）的字符串（YYYY-MM-DD）
 */
export function getThisWeekStart(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) // 调整为周一
  const monday = new Date(today.setDate(diff))
  return formatDateForQuery(monday)
}

/**
 * 获取下周开始日期（周一）的字符串（YYYY-MM-DD）
 */
export function getNextWeekStart(): string {
  const nextMonday = new Date()
  const day = nextMonday.getDay()
  const diff = nextMonday.getDate() - day + (day === 0 ? -6 : 1) + 7 // 下周周一
  const monday = new Date(nextMonday.setDate(diff))
  return formatDateForQuery(monday)
}

/**
 * 获取相对日期的字符串（YYYY-MM-DD）
 * @param days 相对天数（正数为未来，负数为过去）
 * @param baseDate 基准日期（可选，默认为今天）
 */
export function getRelativeDate(days: number, baseDate?: string): string {
  const base = baseDate ? new Date(baseDate) : new Date()
  const targetDate = new Date(base)
  targetDate.setDate(targetDate.getDate() + days)
  return formatDateForQuery(targetDate)
}

/**
 * 确保结束日期不早于开始日期
 * @param startDate 开始日期字符串
 * @param endDate 结束日期字符串
 * @returns 调整后的结束日期字符串
 */
export function ensureEndDateAfterStart(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (end < start) {
    return formatDateForQuery(start)
  }
  return endDate
}
