import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 获取用户的所有行动模板
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') as 'health' | 'learning' | 'project' | 'custom' | null

  let query = supabase
    .from('action_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching action templates:', error)
    // 如果是表不存在，返回更友好的错误
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return NextResponse.json({ 
        error: '模板功能未初始化，请先执行数据库迁移',
        code: 'TABLE_NOT_FOUND',
        details: error.message
      }, { status: 503 })
    }
    // 如果是权限问题
    if (error.code === '42501' || error.message?.includes('permission')) {
      return NextResponse.json({ 
        error: '没有权限访问模板，请检查 RLS 策略',
        code: 'PERMISSION_DENIED',
        details: error.message
      }, { status: 403 })
    }
    return NextResponse.json({ 
      error: 'Failed to fetch templates', 
      code: error.code || 'UNKNOWN',
      details: error.message 
    }, { status: 500 })
  }

  return NextResponse.json({ templates: data || [] })
}

/**
 * 创建行动模板
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { category, title, definition, estimated_time } = body

  // 验证输入
  if (!category || !title || !definition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!['health', 'learning', 'project', 'custom'].includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('action_templates')
    .insert({
      user_id: user.id,
      category,
      title,
      definition,
      estimated_time: estimated_time || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating action template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }

  return NextResponse.json({ template: data })
}

