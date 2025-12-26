import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 目标执行应用的 API 错误处理函数
 * 仅用于处理当前应用的 API 响应错误
 * 
 * @param response - Fetch API 响应对象
 * @param defaultMessage - 默认错误消息
 * @returns 解析后的响应数据，如果出错则返回 null
 */
export async function handleApiResponse<T = unknown>(
  response: Response,
  defaultMessage: string = '操作失败，请重试'
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await response.json().catch(() => ({}))
    
    if (!response.ok) {
      const errorMessage = data.error || defaultMessage
      
      // 根据状态码显示不同的提示，使用当前应用的 Toast 样式
      if (response.status === 401) {
        toast.error('未授权，请重新登录', {
          description: '您的登录已过期，请重新登录',
        })
      } else if (response.status === 404) {
        toast.error('资源不存在', {
          description: '请求的资源未找到，请刷新页面重试',
        })
      } else if (response.status === 409) {
        // 409 Conflict 使用 warning，表示状态冲突而非错误
        // 根据错误消息提供更友好的提示
        let friendlyMessage = '请刷新页面查看最新状态'
        if (errorMessage.includes('already completed') || errorMessage.includes('已完成')) {
          friendlyMessage = '此行动已完成，无法重复完成'
        } else if (errorMessage.includes('Cannot mark') || errorMessage.includes('无法标记')) {
          friendlyMessage = '已完成的行动无法标记为未完成'
        } else if (errorMessage.includes('in progress') || errorMessage.includes('进行中') || errorMessage.includes('当前目标正在进行中')) {
          friendlyMessage = errorMessage.includes('当前目标正在进行中') ? errorMessage : '当前目标正在进行中，请先完成或放弃当前目标'
        } else if (errorMessage.includes('Cannot create') || errorMessage.includes('无法创建')) {
          friendlyMessage = '无法创建新目标，请先完成或放弃当前目标'
        } else if (errorMessage.includes('Goal has no phases') || errorMessage.includes('没有阶段')) {
          friendlyMessage = '目标还没有阶段，请先创建阶段和行动'
        } else if (errorMessage.includes('Phase has no actions') || errorMessage.includes('没有行动')) {
          friendlyMessage = '阶段还没有行动，请先创建行动'
        }
        toast.warning('操作被系统拒绝', {
          description: friendlyMessage,
        })
      } else if (response.status === 400) {
        toast.error('请求参数错误', {
          description: errorMessage || '请检查输入后重试',
        })
      } else if (response.status >= 500) {
        toast.error('服务器错误', {
          description: '服务器暂时无法处理请求，请稍后重试',
        })
      } else {
        toast.error('操作失败', {
          description: errorMessage,
        })
      }
      
      return { success: false, error: errorMessage }
    }
    
    return { success: true, data: data as T }
  } catch (error) {
    console.error('Error parsing API response:', error)
    // 检查是否是网络错误
    const isNetworkError = error instanceof TypeError && error.message.includes('fetch')
    if (isNetworkError) {
      toast.error('网络连接失败', {
        description: '请检查网络连接后重试，或稍后再试',
        duration: 5000,
      })
    } else {
      toast.error('操作失败', {
        description: defaultMessage,
      })
    }
    return { success: false, error: defaultMessage }
  }
}

/**
 * 目标创建时的日期快捷选择函数
 * 仅用于目标创建表单，降低操作摩擦
 * 
 * 时区处理说明：
 * - 使用 toISOString().split('T')[0] 获取 YYYY-MM-DD 格式
 * - 此方法基于 UTC 时区，但 input[type="date"] 会自动转换为用户本地时区显示
 * - 对于日期比较和存储，使用 ISO 格式可确保一致性
 */

/**
 * 格式化日期为 YYYY-MM-DD 格式（用于 input[type="date"]）
 * 
 * 注意：使用 UTC 时区的 ISO 格式，确保跨时区一致性
 * input[type="date"] 会自动处理时区转换显示
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * 获取今天日期（基于本地时区，转换为 ISO 格式）
 */
export function getToday(): string {
  return formatDateForInput(new Date())
}

/**
 * 获取明天日期
 */
export function getTomorrow(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return formatDateForInput(tomorrow)
}

/**
 * 获取本周开始日期（周一）
 * 
 * 注意：创建新 Date 对象避免修改原对象
 */
export function getThisWeekStart(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) // 调整为周一
  const monday = new Date(today)
  monday.setDate(diff)
  return formatDateForInput(monday)
}

/**
 * 获取下周开始日期（下周一）
 * 
 * 注意：创建新 Date 对象避免修改原对象
 */
export function getNextWeekStart(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) + 7 // 下周一
  const nextMonday = new Date(today)
  nextMonday.setDate(diff)
  return formatDateForInput(nextMonday)
}

/**
 * 获取相对日期（N天后）
 * 
 * @param days - 天数
 * @param baseDate - 基准日期（可选，默认为今天）
 * @returns 相对日期（YYYY-MM-DD）
 */
export function getRelativeDate(days: number, baseDate?: Date | string): string {
  const date = baseDate ? new Date(baseDate) : new Date()
  date.setDate(date.getDate() + days)
  return formatDateForInput(date)
}

/**
 * 验证并调整日期：确保结束日期 >= 开始日期
 * 
 * @param startDate - 开始日期（YYYY-MM-DD）
 * @param endDate - 结束日期（YYYY-MM-DD）
 * @returns 调整后的结束日期，如果 endDate < startDate，返回 startDate
 */
export function ensureEndDateAfterStart(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return endDate
  return endDate >= startDate ? endDate : startDate
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

