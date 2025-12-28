// 向后兼容：重新导出所有工具函数
// 新的代码应该直接从子模块导入，如：import { cn } from '@/lib/utils/format'

export { cn, renderSimpleMarkdown, replacePlaceholders } from './utils/format'
export { handleApiResponse, fetchWithRetry } from './utils/api'
export {
  formatDateForInput,
  getToday,
  getTomorrow,
  getThisWeekStart,
  getNextWeekStart,
  getRelativeDate,
  ensureEndDateAfterStart,
} from './utils/date'
