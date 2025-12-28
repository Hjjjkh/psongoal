'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Pause, Square, RotateCcw, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface FocusTimerProps {
  actionId?: string | null
  todoId?: string | null
  actionTitle?: string
  todoContent?: string
  defaultDuration?: number  // 默认时长（分钟），默认25分钟
  onComplete?: (durationMinutes: number) => void
  onCancel?: () => void
}

/**
 * 专注计时器组件（从属于 Action/代办）
 * 注意：专注不等于完成，且永不自动推进状态
 */
export default function FocusTimer({
  actionId,
  todoId,
  actionTitle,
  todoContent,
  defaultDuration = 25,
  onComplete,
  onCancel,
}: FocusTimerProps) {
  const [duration, setDuration] = useState(defaultDuration)  // 分钟
  const [remainingSeconds, setRemainingSeconds] = useState(duration * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const handleCompleteRef = useRef<() => Promise<void>>() // 使用 ref 存储最新的 handleComplete

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // 开始专注
  const handleStart = async () => {
    try {
      const response = await fetch('/api/focus-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId,
          todoId,
          durationMinutes: duration,
          sessionType: 'pomodoro',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || '启动专注失败'
        console.error('API error response:', errorData)
        toast.error('启动专注失败', {
          description: errorMessage,
          duration: 5000,
        })
        return
      }

      const result = await response.json()
      if (result.success && result.data) {
        setSessionId(result.data.id)
        setIsRunning(true)
        setIsPaused(false)
        toast.success('专注已开始', { duration: 2000 })
      } else {
        toast.error('启动专注失败', {
          description: result.error || '未知错误',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error starting focus session:', error)
      toast.error('启动专注失败', {
        description: '网络错误，请检查连接后重试',
        duration: 5000,
      })
    }
  }

  // 暂停/继续
  const handlePause = () => {
    setIsPaused(!isPaused)
  }

  // 结束专注（取消）
  const handleStop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    const currentSessionId = sessionId

    // 先更新 UI 状态，不等待 API 调用
    setIsRunning(false)
    setIsPaused(false)
    setRemainingSeconds(duration * 60) // 重置时间
    setSessionId(null)

    toast.info('专注已取消', { duration: 2000 })

    // 异步调用回调，不阻塞 UI
    if (onCancel) {
      setTimeout(() => {
        onCancel()
      }, 0)
    }

    // 后台更新 API，不阻塞 UI
    if (currentSessionId) {
      fetch(`/api/focus-sessions/${currentSessionId}`, {
        method: 'PUT',
      }).catch((error) => {
        console.error('Error ending focus session:', error)
      })
    }
  }

  // 完成专注（使用 useCallback 避免 useEffect 依赖问题）
  const handleComplete = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    const currentSessionId = sessionId
    const completedMinutes = Math.ceil((duration * 60 - remainingSeconds) / 60) // 计算实际专注的分钟数

    // 先更新 UI 状态，不等待 API 调用
    setIsRunning(false)
    setIsPaused(false)
    setRemainingSeconds(duration * 60) // 重置时间
    setSessionId(null)

    toast.success('专注完成！', { duration: 2000 })

    // 异步调用回调，不阻塞 UI
    if (onComplete) {
      // 使用 setTimeout 确保状态更新完成后再调用回调
      setTimeout(() => {
        onComplete(completedMinutes)
      }, 0)
    }

    // 后台更新 API，不阻塞 UI
    if (currentSessionId) {
      fetch(`/api/focus-sessions/${currentSessionId}`, {
        method: 'PUT',
      }).catch((error) => {
        console.error('Error ending focus session:', error)
      })
    }
  }, [sessionId, duration, remainingSeconds, onComplete])

  // 更新 ref 以保持最新的 handleComplete
  useEffect(() => {
    handleCompleteRef.current = handleComplete
  }, [handleComplete])

  // 手动完成专注
  const handleManualComplete = async () => {
    await handleComplete()
  }

  // 重置
  const handleReset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
    setIsPaused(false)
    setRemainingSeconds(duration * 60)
    setSessionId(null)
  }

  // 计时器逻辑（优化：减少依赖项，避免频繁重新创建）
  useEffect(() => {
    if (!isRunning || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // 只在 isRunning 和 isPaused 变化时重新创建定时器
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // 时间到，立即触发完成
          // 先清理定时器
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          // 使用 ref 调用最新的 handleComplete（避免依赖项问题）
          if (handleCompleteRef.current) {
            Promise.resolve().then(() => {
              handleCompleteRef.current?.()
            })
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, isPaused]) // 移除 remainingSeconds 依赖，避免频繁重新创建定时器

  const taskName = actionTitle || todoContent || '当前任务'

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">专注计时</CardTitle>
        <CardDescription className="text-sm mt-2">
          {taskName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 时间显示 */}
        <div className="text-center">
          <div className="text-6xl font-bold text-primary mb-2">
            {formatTime(remainingSeconds)}
          </div>
          <p className="text-sm text-muted-foreground">
            {isRunning ? (isPaused ? '已暂停' : '专注中...') : '准备开始'}
          </p>
        </div>

        {/* 控制按钮 */}
        <div className="flex gap-3 justify-center flex-wrap">
          {!isRunning ? (
            <>
              <Button
                onClick={handleStart}
                size="lg"
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                开始专注
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                size="lg"
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                重置
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handlePause}
                variant={isPaused ? 'default' : 'outline'}
                size="lg"
                className="gap-2"
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4" />
                    继续
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" />
                    暂停
                  </>
                )}
              </Button>
              <Button
                onClick={handleManualComplete}
                variant="default"
                size="lg"
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                完成
              </Button>
              <Button
                onClick={handleStop}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Square className="w-4 h-4" />
                取消
              </Button>
            </>
          )}
        </div>

        {/* 提示 */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            💡 专注不等于完成，完成后请记得标记任务完成
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

