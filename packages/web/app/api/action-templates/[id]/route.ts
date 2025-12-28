import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 更新行动模板
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, definition, estimated_time, category } = body

  const updates: any = {}
  if (title !== undefined) updates.title = title
  if (definition !== undefined) updates.definition = definition
  if (estimated_time !== undefined) updates.estimated_time = estimated_time
  if (category !== undefined) {
    if (!['health', 'learning', 'project', 'custom'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    updates.category = category
  }

  const { data, error } = await supabase
    .from('action_templates')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating action template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  return NextResponse.json({ template: data })
}

/**
 * 删除行动模板
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('action_templates')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting action template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

