'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Timer, CheckCircle2, ListTodo, XCircle, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { handleApiResponse } from '@/lib/utils'
import FocusTimer from '@/components/focus-timer'
import type { Goal, Phase, Action } from '@/lib/types'
import type { Todo } from '@/lib/todos'

interface FocusSpaceViewProps {
  action: Action | null
  goal: Goal | null
  phase: Phase | null
  todos: Todo[]
}

/**
 * 独立专注空间视图
 * 用户可以在这里：
 * 1. 选择主线Action或代办开始专注（可选）
 * 2. 直接标记完成（不强制使用计时器）
 * 3. 使用专注计时器（可选）
 */
export default function FocusSpaceView({
  action,
  goal,
  phase,
  todos,
}: FocusSpaceViewProps) {
  const router = useRouter()
  const [selectedTaskType, setSelectedTaskType] = useState<'action' | 'todo' | null>(null)
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [showFocusTimer, setShowFocusTimer] = useState(true) // 初始显示计时器
  const [newTodoContent, setNewTodoContent] = useState('')
  const [showAddTodo, setShowAddTodo] = useState(false)
  const [isAddingTodo, setIsAddingTodo] = useState(false)
  const [currentTodos, setCurrentTodos] = useState<Todo[]>(todos) // 直接使用 props 作为初始值

  // 初始化 todos（直接使用 props，无需 mounted 状态）
  useEffect(() => {
    setCurrentTodos(todos)
  }, [todos])

  // 标记Action完成
  const handleCompleteAction = async () => {
    if (!action) return

    try {
      const response = await fetch('/api/complete-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: action.id,
          difficulty: 3,  // 默认值
          energy: 3,
        }),
      })

      const result = await handleApiResponse(response, '标记完成失败')
      
      if (result.success) {
        toast.success('行动已完成！', { duration: 2000 })
        // 刷新页面以更新状态
        setTimeout(() => {
          router.refresh()
        }, 1500)
      }
    } catch (error) {
      console.error('Error completing action:', error)
    }
  }

  // 添加代办
  const handleAddTodo = async () => {
    if (!newTodoContent.trim()) {
      return
    }

    setIsAddingTodo(true)
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newTodoContent.trim() }),
      })

      // 先检查响应状态
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API error response:', errorData)
        toast.error(errorData.error || '添加代办失败', {
          description: '请检查网络连接或稍后重试',
          duration: 5000,
        })
        return
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        setNewTodoContent('')
        setShowAddTodo(false)
        setCurrentTodos([...currentTodos, result.data])
        toast.success('代办已添加', { duration: 2000 })
      } else {
        toast.error(result.error || '添加代办失败', {
          description: '请稍后重试',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error adding todo:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      toast.error('添加代办失败', {
        description: errorMessage,
        duration: 5000,
      })
    } finally {
      setIsAddingTodo(false)
    }
  }

  // 标记代办完成（勾选后直接删除）
  const handleCompleteTodo = async (todoId: string) => {
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: true }),
      })

      const result = await handleApiResponse(response, '标记完成失败')
      
      if (result.success) {
        // 勾选后直接删除（完成=消失）
        await fetch(`/api/todos/${todoId}`, {
          method: 'DELETE',
        })
        setCurrentTodos(currentTodos.filter(t => t.id !== todoId))
        toast.success('代办已处理', { duration: 2000 })
      }
    } catch (error) {
      console.error('Error completing todo:', error)
    }
  }

  // 忽略代办
  const handleIgnoreTodo = async (todoId: string) => {
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
      })

      const result = await handleApiResponse(response, '删除失败')
      
      if (result.success) {
        setCurrentTodos(currentTodos.filter(t => t.id !== todoId))
      }
    } catch (error) {
      console.error('Error ignoring todo:', error)
    }
  }

  // 开始专注（选择任务类型）
  const handleStartFocus = (type: 'action' | 'todo', todoId?: string) => {
    setSelectedTaskType(type)
    if (type === 'todo' && todoId) {
      setSelectedTodoId(todoId)
    }
    // 确保计时器显示
    setShowFocusTimer(true)
  }

  // 专注完成回调
  const handleFocusComplete = (durationMinutes: number) => {
    // 完成时保持计时器可见，只重置任务选择状态，让用户可以重新选择任务
    setSelectedTaskType(null)
    setSelectedTodoId(null)
    // 不隐藏计时器，保持 showFocusTimer 为 true
    toast.success(`专注完成！专注了 ${durationMinutes} 分钟`, { duration: 3000 })
  }

  // 专注取消回调
  const handleFocusCancel = () => {
    // 取消时保持计时器可见，只重置任务选择状态，让用户可以重新选择任务
    setSelectedTaskType(null)
    setSelectedTodoId(null)
    // 不隐藏计时器，保持 showFocusTimer 为 true
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6 pt-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center space-y-2 mb-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            专注执行空间
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            在这里完成你的任务，专注计时器帮助你进入状态（可选使用）
          </p>
        </div>

        {/* 专注计时器（始终显示） */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg md:text-xl">专注计时器</CardTitle>
            <CardDescription className="text-center text-xs md:text-sm mt-1">
              帮助进入专注状态，完成后可直接标记任务完成
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedTaskType === 'action' && action ? (
              <FocusTimer
                actionId={action.id}
                actionTitle={action.title}
                defaultDuration={25}
                onComplete={handleFocusComplete}
                onCancel={handleFocusCancel}
              />
            ) : selectedTaskType === 'todo' && selectedTodoId ? (
              <FocusTimer
                todoId={selectedTodoId}
                todoContent={currentTodos.find(t => t.id === selectedTodoId)?.content}
                defaultDuration={25}
                onComplete={handleFocusComplete}
                onCancel={handleFocusCancel}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">选择一个任务开始专注计时</p>
                <p className="text-xs mt-2">💡 也可以直接标记完成，无需使用计时器</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {/* 今日唯一任务 */}
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                今日唯一任务
              </CardTitle>
              <CardDescription className="text-sm">
                这是你今天必须完成的任务，系统不允许跳过
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {action ? (
                <>
                  <div>
                    <p className="text-lg font-semibold">{action.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {action.definition}
                    </p>
                    {goal && (
                      <p className="text-xs text-muted-foreground mt-2">
                        目标：{goal.name}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {!selectedTaskType && (
                      <Button
                        onClick={() => handleStartFocus('action')}
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        <Timer className="w-4 h-4" />
                        使用计时器
                      </Button>
                    )}
                    <Button
                      onClick={handleCompleteAction}
                      className="flex-1 gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      直接完成
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    💡 建议：如果已经完成，直接点击&ldquo;直接完成&rdquo;即可，计时器仅用于帮助进入专注状态
                  </p>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>今日唯一任务已完成</p>
                  <p className="text-xs mt-2">或尚未创建目标</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 代办任务列表 */}
          <Card className="border-muted/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ListTodo className="w-5 h-5 text-muted-foreground" />
                    代办事项
                  </CardTitle>
                  <CardDescription className="text-sm">
                    记录一些不想忘记的事情，不影响唯一任务进度
                  </CardDescription>
                </div>
                {!showAddTodo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddTodo(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 添加代办输入框 */}
              {showAddTodo && (
                <div className="flex gap-2">
                  <Input
                    value={newTodoContent}
                    onChange={(e) => setNewTodoContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTodo()
                      } else if (e.key === 'Escape') {
                        setShowAddTodo(false)
                        setNewTodoContent('')
                      }
                    }}
                    placeholder="输入代办事项..."
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleAddTodo}
                    disabled={isAddingTodo || !newTodoContent.trim()}
                    className="h-8 px-3"
                  >
                    {isAddingTodo ? '...' : '添加'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddTodo(false)
                      setNewTodoContent('')
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {currentTodos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>暂无代办事项</p>
                  {!showAddTodo && (
                    <p className="text-xs mt-2">点击上方 + 添加</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {currentTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-start gap-2 p-3 rounded-md hover:bg-muted/50 transition-colors group"
                    >
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => handleCompleteTodo(todo.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed break-words">{todo.content}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!selectedTaskType && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartFocus('todo', todo.id)}
                            className="h-7 px-2 gap-1 text-xs"
                          >
                            <Timer className="w-3 h-3" />
                            专注
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleIgnoreTodo(todo.id)}
                          className="h-7 w-7 p-0"
                          title="忽略（不再重要）"
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 提示信息 */}
        <Card className="border-muted/50 bg-muted/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground text-center">
              💡 专注计时器是辅助工具，帮助你进入专注状态。如果任务已完成，直接标记完成即可，无需使用计时器
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

