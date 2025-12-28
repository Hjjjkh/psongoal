import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 简单的 Markdown 渲染（支持粗体、换行）
 * 将 Markdown 文本转换为 HTML 字符串（用于 dangerouslySetInnerHTML）
 * 
 * @param text - Markdown 文本
 * @returns HTML 字符串
 */
export function renderSimpleMarkdown(text: string): string {
  if (!text) return ''
  
  return text
    .split('\n')
    .map(line => {
      if (line.trim() === '') return '<br />'
      // 处理粗体 **text**
      return line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    })
    .join('')
}

/**
 * 目标模板占位符替换函数
 * 仅用于目标创建时的模板占位符替换
 * 支持以下占位符：
 * - {n}: 序号（1, 2, 3...）
 * - {date}: 当前日期（YYYY-MM-DD）
 * - {date+N}: 当前日期加N天（如 {date+7} 表示7天后）
 * - {week}: 当前周数（第X周）
 * - {userName}: 用户名（需要传入）
 * - {year}: 当前年份
 * - {month}: 当前月份
 * - {day}: 当前日期（1-31）
 * 
 * @param template - 模板字符串
 * @param index - 序号（用于 {n}）
 * @param userName - 用户名（可选）
 * @param baseDate - 基准日期（可选，默认为今天）
 * @returns 替换后的字符串
 */
export function replacePlaceholders(
  template: string,
  index: number = 1,
  userName?: string,
  baseDate?: Date
): string {
  if (!template) return ''
  
  const date = baseDate || new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`
  
  // 计算周数（从年初开始）
  const startOfYear = new Date(year, 0, 1)
  const daysSinceStart = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
  const week = Math.floor(daysSinceStart / 7) + 1
  
  let result = template
  
  // 替换 {n}
  result = result.replace(/{n}/g, index.toString())
  
  // 替换 {date+N} 格式（必须在 {date} 之前处理）
  result = result.replace(/{date\+(\d+)}/g, (match, days) => {
    const targetDate = new Date(date)
    targetDate.setDate(targetDate.getDate() + parseInt(days))
    const targetYear = targetDate.getFullYear()
    const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0')
    const targetDay = String(targetDate.getDate()).padStart(2, '0')
    return `${targetYear}-${targetMonth}-${targetDay}`
  })
  
  // 替换 {date}
  result = result.replace(/{date}/g, dateStr)
  
  // 替换 {week}
  result = result.replace(/{week}/g, week.toString())
  
  // 替换 {year}
  result = result.replace(/{year}/g, year.toString())
  
  // 替换 {month}
  result = result.replace(/{month}/g, month)
  
  // 替换 {day}
  result = result.replace(/{day}/g, day)
  
  // 替换 {userName}
  if (userName) {
    result = result.replace(/{userName}/g, userName)
  }
  
  return result
}

