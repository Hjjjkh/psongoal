/**
 * 专注会话管理（从属于 Action/代办）
 * 注意：专注数据永远从属于任务，不能独立叙事
 */

import { createClient } from '../supabase/server'

export interface FocusSession {
  id: string
  user_id: string
  action_id: string | null  // 关联 Action（可为空）
  todo_id: string | null  // 关联代办（可为空）
  duration_minutes: number
  session_type: 'pomodoro' | 'custom'
  started_at: string
  ended_at: string | null
  created_at: string
}

/**
 * 创建专注会话
 */
export async function createFocusSession(
  userId: string,
  options: {
    actionId?: string | null
    todoId?: string | null
    durationMinutes: number
    sessionType?: 'pomodoro' | 'custom'
  }
): Promise<FocusSession | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: userId,
      action_id: options.actionId || null,
      todo_id: options.todoId || null,
      duration_minutes: options.durationMinutes,
      session_type: options.sessionType || 'pomodoro',
      started_at: new Date().toISOString(),
      ended_at: null,  // 开始时未结束
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating focus session:', error)
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    
    // 如果是表不存在错误，提供更明确的提示
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      console.error('Table "focus_sessions" does not exist. Please run the migration: supabase/migration_add_focus_sessions.sql')
    }
    
    return null
  }

  return data
}

/**
 * 结束专注会话
 */
export async function endFocusSession(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('focus_sessions')
    .update({
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error ending focus session:', error)
    return false
  }

  return true
}

/**
 * 获取任务的专注统计（从属于任务）
 */
export async function getTaskFocusStats(
  userId: string,
  options: {
    actionId?: string | null
    todoId?: string | null
    date?: string  // 可选：指定日期
  }
): Promise<{
  totalSessions: number
  totalMinutes: number
  todaySessions: number
  todayMinutes: number
}> {
  const supabase = await createClient()

  // 构建查询条件
  let query = supabase
    .from('focus_sessions')
    .select('duration_minutes, started_at, ended_at')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)  // 只统计已完成的会话

  if (options.actionId) {
    query = query.eq('action_id', options.actionId)
  } else if (options.todoId) {
    query = query.eq('todo_id', options.todoId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching focus stats:', error)
    return {
      totalSessions: 0,
      totalMinutes: 0,
      todaySessions: 0,
      todayMinutes: 0,
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  let totalSessions = 0
  let totalMinutes = 0
  let todaySessions = 0
  let todayMinutes = 0

  data?.forEach((session) => {
    if (session.ended_at) {
      totalSessions++
      totalMinutes += session.duration_minutes

      const sessionDate = new Date(session.started_at)
      if (sessionDate.toISOString() >= todayStr) {
        todaySessions++
        todayMinutes += session.duration_minutes
      }
    }
  })

  return {
    totalSessions,
    totalMinutes,
    todaySessions,
    todayMinutes,
  }
}

/**
 * 获取用户今日专注总时长（仅自己可见，不独立叙事）
 */
export async function getTodayTotalFocusMinutes(userId: string): Promise<number> {
  const supabase = await createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  const { data, error } = await supabase
    .from('focus_sessions')
    .select('duration_minutes')
    .eq('user_id', userId)
    .gte('started_at', todayStr)
    .not('ended_at', 'is', null)

  if (error) {
    console.error('Error fetching today focus:', error)
    return 0
  }

  return data?.reduce((sum, session) => sum + session.duration_minutes, 0) || 0
}

