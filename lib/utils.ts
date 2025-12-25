import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 统一的 API 错误处理函数
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
      
      // 根据状态码显示不同的提示，使用统一的 Toast 样式
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
        toast.warning('操作被系统拒绝', {
          description: errorMessage || '请刷新页面查看最新状态',
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
    toast.error('操作失败', {
      description: defaultMessage,
    })
    return { success: false, error: defaultMessage }
  }
}

/**
 * 统一的 API 请求包装函数
 * 自动处理错误和 Toast 提示
 * 
 * @param url - API 端点
 * @param options - Fetch 选项
 * @returns 解析后的响应数据
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    
    return await handleApiResponse<T>(response)
  } catch (error) {
    console.error('API request error:', error)
    toast.error('网络错误', {
      description: '请检查网络连接后重试',
    })
    return { success: false, error: '网络错误' }
  }
}

