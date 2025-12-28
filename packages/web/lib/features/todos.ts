/**
 * 代办事项管理（认知降级版本）
 * 注意：这不是任务系统，只是记忆容器
 * 不参与任何统计、不影响主线进度
 */

import { createClient } from '../supabase/server'

/**
 * 代办事项接口（认知降级版本）
 * 注意：使用 checked 而不是 completed，语义更弱
 * 注意：expires_at 是失效时间（自动清理），不是计划日期
 */
export interface Todo {
  id: string
  user_id: string
  content: string
  checked: boolean  // 改为 checked，表示"处理过"而非"完成"
  checked_at: string | null  // 改为 checked_at，弱化时间语义
  expires_at: string  // 失效时间：7天后自动清理（不是计划日期）
  created_at: string
  updated_at: string
}

/**
 * 获取用户的代办事项（未处理的优先）
 * 自动过滤已过期的代办（失效时间已过）
 */
export async function getUserTodos(userId: string): Promise<Todo[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .gte('expires_at', now)  // 只获取未过期的代办
    .order('checked', { ascending: true })  // 改为 checked
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching todos:', error)
    return []
  }

  return data || []
}

/**
 * 创建代办事项
 * 自动设置失效时间为7天后（固定规则，不可设置）
 */
export async function createTodo(
  userId: string,
  content: string
): Promise<Todo> {
  const supabase = await createClient()

  // 计算7天后的失效时间
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  console.log('Attempting to create todo:', {
    userId,
    content: content.substring(0, 50),
    expiresAt: expiresAt.toISOString()
  })

  const { data, error } = await supabase
    .from('todos')
    .insert({
      user_id: userId,
      content: content.trim(),
      checked: false,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase error creating todo:', error)
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    
    // 如果是表不存在错误，提供更明确的提示
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      const err = new Error('数据库表不存在，请运行迁移脚本：supabase/migration_add_todos.sql')
      ;(err as any).code = error.code
      ;(err as any).supabaseError = error
      throw err
    }
    
    // 抛出错误，让调用者可以获取详细信息
    const err = new Error(error.message || '创建代办失败')
    ;(err as any).code = error.code
    ;(err as any).details = error.details
    ;(err as any).hint = error.hint
    ;(err as any).supabaseError = error
    throw err
  }

  if (!data) {
    throw new Error('创建代办失败：未返回数据')
  }

  console.log('Todo created successfully:', data.id)
  return data
}

/**
 * 更新代办事项（主要是标记处理/未处理）
 */
export async function updateTodo(
  userId: string,
  todoId: string,
  updates: {
    content?: string
    checked?: boolean  // 改为 checked
  }
): Promise<boolean> {
  const supabase = await createClient()

  const updateData: any = {}
  if (updates.content !== undefined) {
    updateData.content = updates.content.trim()
  }
  if (updates.checked !== undefined) {
    updateData.checked = updates.checked
    updateData.checked_at = updates.checked ? new Date().toISOString() : null  // 改为 checked_at
  }
  updateData.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('todos')
    .update(updateData)
    .eq('id', todoId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating todo:', error)
    return false
  }

  return true
}

/**
 * 删除代办事项
 */
export async function deleteTodo(
  userId: string,
  todoId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', todoId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting todo:', error)
    return false
  }

  return true
}

/**
 * 批量删除已处理的代办事项
 */
export async function clearCheckedTodos(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('user_id', userId)
    .eq('checked', true)  // 改为 checked

  if (error) {
    console.error('Error clearing completed todos:', error)
    return false
  }

  return true
}

/**
 * 自动清理过期的代办事项（后台任务）
 * 清理指定用户的所有已过期的代办
 */
export async function cleanupExpiredTodos(userId: string): Promise<number> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('todos')
    .delete()
    .eq('user_id', userId)  // 只清理当前用户的
    .lt('expires_at', now)  // 删除所有已过期的代办
    .select()

  if (error) {
    console.error('Error cleaning up expired todos:', error)
    return 0
  }

  return data?.length || 0
}

