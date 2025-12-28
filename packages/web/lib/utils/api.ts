import { toast } from "sonner"

/**
 * 目标执行应用的 API 错误处理函数（带重试机制）
 * 仅用于处理当前应用的 API 响应错误
 * 
 * @param response - Fetch API 响应对象
 * @param defaultMessage - 默认错误消息
 * @param retryCount - 当前重试次数（内部使用）
 * @param maxRetries - 最大重试次数
 * @returns 解析后的响应数据，如果出错则返回 null
 */
export async function handleApiResponse<T = unknown>(
  response: Response,
  defaultMessage: string = '操作失败，请重试',
  retryCount: number = 0,
  maxRetries: number = 0
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await response.json().catch(() => ({}))
    
    if (!response.ok) {
      const errorMessage = data.error || defaultMessage
      
      // 网络错误或5xx错误，且未达到最大重试次数时，可以重试
      const isRetryable = (response.status >= 500 || response.status === 0) && retryCount < maxRetries
      
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
      } else if (response.status >= 500 || response.status === 0) {
        // 服务器错误或网络错误
        if (isRetryable) {
          // 可以重试，不显示错误，由调用者处理重试
          return { success: false, error: errorMessage, retryable: true } as any
        } else {
          // 不能重试或已达到最大重试次数
          const serverError = errorMessage || '服务器暂时无法处理请求，请稍后重试'
          toast.error('服务器错误', {
            description: serverError,
            duration: 5000,
          })
          console.error('Server error details:', {
            status: response.status,
            statusText: response.statusText,
            error: errorMessage,
            url: response.url
          })
        }
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
      // 网络错误可以重试
      if (retryCount < maxRetries) {
        return { success: false, error: defaultMessage, retryable: true } as any
      }
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
 * 带重试机制的 API 请求函数
 * 
 * @param fetchFn - 返回 Promise<Response> 的函数
 * @param maxRetries - 最大重试次数（默认2次）
 * @param retryDelay - 重试延迟（毫秒，默认1000ms）
 * @param defaultMessage - 默认错误消息
 * @returns 解析后的响应数据
 */
export async function fetchWithRetry<T = unknown>(
  fetchFn: () => Promise<Response>,
  maxRetries: number = 2,
  retryDelay: number = 1000,
  defaultMessage: string = '操作失败，请重试'
): Promise<{ success: boolean; data?: T; error?: string }> {
  let lastError: { success: boolean; error?: string } | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchFn()
      const result = await handleApiResponse<T>(response, defaultMessage, attempt, maxRetries)
      
      // 如果成功或不可重试的错误，直接返回
      if (result.success || !(result as any).retryable) {
        return result
      }
      
      // 可重试的错误，保存错误信息，等待重试
      lastError = result
      
      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
        continue
      }
    } catch (error) {
      // 网络错误或其他异常
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
        continue
      }
      // 最后一次尝试也失败
      return handleApiResponse<T>(new Response(null, { status: 0 }), defaultMessage, attempt, maxRetries)
    }
  }
  
  // 所有重试都失败
  return lastError || { success: false, error: defaultMessage }
}

