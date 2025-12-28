import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateTodo, deleteTodo } from '@/lib/todos'

/**
 * 更新代办事项
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, checked } = body  // 改为 checked

    const updates: any = {}
    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json({ error: 'Invalid content' }, { status: 400 })
      }
      if (content.trim().length > 500) {
        return NextResponse.json({ error: 'Content too long' }, { status: 400 })
      }
      updates.content = content
    }
    if (checked !== undefined) {
      if (typeof checked !== 'boolean') {
        return NextResponse.json({ error: 'Invalid checked value' }, { status: 400 })
      }
      updates.checked = checked  // 改为 checked
    }

    const { id } = await params
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid todo ID' },
        { status: 400 }
      )
    }

    const success = await updateTodo(user.id, id, updates)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update todo or todo not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating todo:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 删除代办事项
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid todo ID' },
        { status: 400 }
      )
    }

    const success = await deleteTodo(user.id, id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete todo or todo not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting todo:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

