import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserTodos, createTodo, clearCheckedTodos } from '@/lib/todos'
import { VALIDATION_LIMITS, ERROR_MESSAGES } from '@/lib/constants/validation'

/**
 * 获取代办事项列表
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const todos = await getUserTodos(user.id)

    return NextResponse.json({ success: true, data: todos })
  } catch (error) {
    console.error('Error fetching todos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 创建代办事项
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: ERROR_MESSAGES.CONTENT_REQUIRED }, { status: 400 })
    }

    if (content.trim().length > VALIDATION_LIMITS.MAX_TODO_CONTENT_LENGTH) {
      return NextResponse.json({ 
        error: ERROR_MESSAGES.CONTENT_TOO_LONG,
        details: `Maximum length is ${VALIDATION_LIMITS.MAX_TODO_CONTENT_LENGTH} characters`
      }, { status: 400 })
    }

    let todo
    try {
      todo = await createTodo(user.id, content)
    } catch (error) {
      console.error('Error in createTodo:', error)
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorCode = (error as { code?: string })?.code
      
      // 如果是表不存在错误
      if (errorCode === '42P01' || errorMessage?.includes('does not exist') || errorMessage?.includes('表不存在')) {
        return NextResponse.json(
          { error: '数据库表不存在，请运行迁移脚本：supabase/migration_add_todos.sql' },
          { status: 500 }
        )
      }
      
      // 如果是权限错误（RLS 策略问题）
      if (errorCode === '42501' || errorMessage?.includes('permission denied') || errorMessage?.includes('权限')) {
        return NextResponse.json(
          { error: '数据库权限错误，请检查 RLS 策略配置' },
          { status: 500 }
        )
      }
      
      // 返回具体错误信息
      const finalErrorMessage = errorMessage || '创建代办失败，请检查数据库连接和表结构'
      return NextResponse.json(
        { error: finalErrorMessage },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: todo })
  } catch (error) {
    console.error('Error creating todo:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error stack:', errorStack)
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    )
  }
}

/**
 * 批量删除已处理的代办事项
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'clear-checked') {
      const success = await clearCheckedTodos(user.id)
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to clear completed todos' },
          { status: 500 }
        )
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error clearing todos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

