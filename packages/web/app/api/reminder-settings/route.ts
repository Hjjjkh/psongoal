import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 获取提醒设置
 */
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: systemState, error } = await supabase
    .from('system_states')
    .select('reminder_enabled, reminder_time')
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('Error fetching reminder settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }

  return NextResponse.json({
    enabled: systemState?.reminder_enabled ?? false,
    time: systemState?.reminder_time || null,
  })
}

/**
 * 更新提醒设置
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { enabled, time } = body

  // 验证输入
  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid enabled value' }, { status: 400 })
  }

  if (enabled && time && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    return NextResponse.json({ error: 'Invalid time format' }, { status: 400 })
  }

  // 更新 system_states
  const { error: updateError } = await supabase
    .from('system_states')
    .update({
      reminder_enabled: enabled,
      reminder_time: enabled ? time : null,
    })
    .eq('user_id', user.id)

  if (updateError) {
    console.error('Error updating reminder settings:', updateError)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

