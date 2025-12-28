import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFocusSession } from '@/lib/focus-sessions'

/**
 * 创建专注会话
 * POST /api/focus-sessions
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { actionId, todoId, durationMinutes, sessionType } = body

    // 验证：必须关联 Action 或代办（不能独立启动）
    if (!actionId && !todoId) {
      return NextResponse.json(
        { error: '必须关联 Action 或代办' },
        { status: 400 }
      )
    }

    if (!durationMinutes || durationMinutes <= 0) {
      return NextResponse.json(
        { error: '专注时长必须大于 0' },
        { status: 400 }
      )
    }

    // 先测试数据库连接和表是否存在
    const { data: testData, error: testError } = await supabase
      .from('focus_sessions')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.error('Database test query error:', testError)
      const errorMessage = testError.code === '42P01' || testError.message.includes('does not exist')
        ? '数据库表不存在，请运行迁移脚本：supabase/migration_add_focus_sessions.sql'
        : `数据库错误: ${testError.message}`
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    const session = await createFocusSession(user.id, {
      actionId: actionId || null,
      todoId: todoId || null,
      durationMinutes,
      sessionType: sessionType || 'pomodoro',
    })

    if (!session) {
      return NextResponse.json(
        { error: '创建专注会话失败，请检查数据库连接和表结构' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: session })
  } catch (error) {
    console.error('Error creating focus session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

