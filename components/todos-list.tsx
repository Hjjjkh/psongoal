'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, ListTodo, X, XCircle } from 'lucide-react'
import { handleApiResponse } from '@/lib/utils'

interface Todo {
  id: string
  content: string
  checked: boolean  // 改为 checked，语义更弱
  checked_at: string | null  // 改为 checked_at
  expires_at: string  // 失效时间（用于自动清理，不显示给用户）
  created_at: string
}

/**
 * 计算相对时间（弱化显示）
 * 只用于帮助用户判断是否还重要，不用于排序/过滤
 */
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`
  return `${Math.floor(diffDays / 30)} 个月前`
}

interface TodosListProps {
  show?: boolean
}

/**
 * 代办事项列表（认知降级版本）
 * 注意：这不是任务系统，只是记忆容器
 * 
 * 设计原则：
 * - 不参与统计（无完成数量、完成率、图表）
 * - 不影响唯一任务进度（不进入复盘、不产生完成感）
 * - 只在唯一任务完成后显示（位置靠后）
 * - 只有环境级反馈（勾选后划线、变灰，无系统提示）
 * 
 * 允许的体验：
 * ✅ 快速输入（一行文字，回车即存）
 * ✅ 划掉/隐藏（勾选后淡出，自动折叠）
 * ✅ 自动清理（7天后自动消失）
 * 
 * 禁止的体验：
 * ❌ 完成提示（Toast、成功消息）
 * ❌ 今日完成 X 条（统计数字）
 * ❌ 历史记录（让代办变成轨迹）
 * ❌ 统计图表（把代办变成 KPI）
 */
export default function TodosList({ show = true }: TodosListProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTodoContent, setNewTodoContent] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [showAddInput, setShowAddInput] = useState(false)
  // 代办默认展开，让用户更容易发现和使用
  const [isExpanded, setIsExpanded] = useState(true)

  // 加载代办事项
  useEffect(() => {
    if (show) {
      // 静默清理过期代办（不提示用户）
      cleanupExpiredTodosSilently()
      loadTodos()
    }
  }, [show])

  // 静默清理过期代办（不提示用户）
  const cleanupExpiredTodosSilently = async () => {
    try {
      await fetch('/api/todos/cleanup', { method: 'POST' })
      // 不显示任何提示，保持沉默
    } catch (error) {
      // 静默失败，不影响用户体验
      console.error('Error cleaning up expired todos:', error)
    }
  }

  const loadTodos = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/todos')
      const result = await handleApiResponse<{ data: Todo[] }>(response, '加载代办失败')
      
      if (result.success && result.data) {
        setTodos(result.data.data || result.data)
      }
    } catch (error) {
      console.error('Error loading todos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 添加代办
  const handleAddTodo = async () => {
    if (!newTodoContent.trim()) {
      return
    }

    setIsAdding(true)
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newTodoContent.trim() }),
      })

      const result = await handleApiResponse<{ data: Todo }>(response, '添加代办失败')
      
      if (result.success && result.data) {
        setNewTodoContent('')
        setShowAddInput(false)
        loadTodos()
        // 弱化提示，不显示 Toast，让用户感觉更轻量
      }
    } catch (error) {
      console.error('Error adding todo:', error)
    } finally {
      setIsAdding(false)
    }
  }

  // 切换处理状态（弱化语义，不叫"完成"）
  // 优化：完成=消失，不保留已处理状态
  const handleToggleCheck = async (todoId: string, currentChecked: boolean) => {
    if (!currentChecked) {
      // 勾选后直接删除，完成=消失，不产生完成感
      await handleDeleteTodo(todoId)
    } else {
      // 取消勾选（理论上不应该发生，因为已处理的已删除）
      try {
        const response = await fetch(`/api/todos/${todoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checked: false }),
        })
        const result = await handleApiResponse(response, '更新失败')
        if (result.success) {
          loadTodos()
        }
      } catch (error) {
        console.error('Error toggling todo:', error)
      }
    }
  }

  // 忽略代办（不处理也没关系）
  const handleIgnoreTodo = async (todoId: string) => {
    // 直接删除，给用户"放弃的许可"
    await handleDeleteTodo(todoId)
  }

  // 删除代办
  const handleDeleteTodo = async (todoId: string) => {
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
      })

      const result = await handleApiResponse(response, '删除失败')
      
      if (result.success) {
        loadTodos()
        // 弱化提示
      }
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

  // 清空已处理的代办（弱化语义）
  const handleClearChecked = async () => {
    if (!confirm('确定要清空所有已处理的代办吗？')) {
      return
    }

    try {
      const response = await fetch('/api/todos?action=clear-checked', {
        method: 'DELETE',
      })

      const result = await handleApiResponse(response, '清空失败')
      
      if (result.success) {
        loadTodos()
        // 不显示 Toast，保持沉默
      }
    } catch (error) {
      console.error('Error clearing todos:', error)
    }
  }

  if (!show) return null

  // 优化：只显示未处理的代办，已处理的直接删除（完成=消失）
  const uncheckedTodos = todos.filter(t => !t.checked)

  return (
    <Card className="border-muted/50 bg-muted/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <ListTodo className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">代办事项</CardTitle>
            {uncheckedTodos.length > 0 && (
              <span className="text-xs text-muted-foreground/60">
                ({uncheckedTodos.length})
              </span>
            )}
          </button>
          {!showAddInput && isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddInput(true)}
              className="h-7 px-2"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
        <CardDescription className="text-xs mt-1">
          记录一些不想忘记的事情，不影响唯一任务进度
        </CardDescription>
      </CardHeader>
      {/* 默认展开，方便用户快速使用 */}
      {isExpanded && (
        <CardContent className="space-y-3">
        {/* 添加输入框 */}
        {showAddInput && (
          <div className="flex gap-2">
            <Input
              value={newTodoContent}
              onChange={(e) => setNewTodoContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTodo()
                } else if (e.key === 'Escape') {
                  setShowAddInput(false)
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
              disabled={isAdding || !newTodoContent.trim()}
              className="h-8 px-3"
            >
              {isAdding ? '...' : '添加'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddInput(false)
                setNewTodoContent('')
              }}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* 代办列表 */}
        {isLoading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">加载中...</div>
        ) : todos.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <p>暂无代办事项</p>
            <p className="text-xs mt-1">点击上方 + 添加</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* 未处理的代办 */}
            {uncheckedTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group"
              >
                <Checkbox
                  checked={false}
                  onCheckedChange={() => handleToggleCheck(todo.id, false)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed break-words">{todo.content}</p>
                  {/* 弱化显示创建时间，仅用于帮助判断是否还重要 */}
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    创建于 {getRelativeTime(todo.created_at)}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* 忽略按钮：给用户"放弃的许可" */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleIgnoreTodo(todo.id)}
                    className="h-6 w-6 p-0"
                    title="忽略（不再重要）"
                  >
                    <XCircle className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="h-6 w-6 p-0"
                    aria-label="删除待办事项"
                    title="删除"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        </CardContent>
      )}
    </Card>
  )
}

