import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cleanupExpiredTodos } from '@/lib/todos'

/**
 * 清理过期的代办事项（后台任务）
 * 可以定期调用，清理所有已过期的代办
 * POST /api/todos/cleanup
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cleanedCount = await cleanupExpiredTodos(user.id)

    return NextResponse.json({
      success: true,
      cleaned: cleanedCount,
      message: `已清理 ${cleanedCount} 个过期代办`,
    })
  } catch (error) {
    console.error('Error cleaning up todos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

