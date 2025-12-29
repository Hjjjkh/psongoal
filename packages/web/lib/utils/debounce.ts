/**
 * 防抖工具函数
 * 在指定时间内只执行最后一次调用
 */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * React Hook 版本的防抖
 * 用于在组件中使用防抖功能
 */
import { useRef, useCallback, useEffect } from 'react'

export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const funcRef = useRef(func)

  // 使用 useEffect 更新函数引用，确保总是使用最新的函数
  useEffect(() => {
    funcRef.current = func
  }, [func])

  const debouncedFunc = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        funcRef.current(...args)
      }, wait)
    }) as T,
    [wait]
  )

  return debouncedFunc as T
}

