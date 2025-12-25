import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { phase_id, title, definition, estimated_time } = body

    if (!phase_id || !title || !definition) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 获取当前 phase 的最大 order_index
    const { data: existingActions } = await supabase
      .from('actions')
      .select('order_index')
      .eq('phase_id', phase_id)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrderIndex = existingActions && existingActions.length > 0
      ? existingActions[0].order_index + 1
      : 1

    const { data, error } = await supabase
      .from('actions')
      .insert({
        phase_id,
        title,
        definition,
        estimated_time: estimated_time || null,
        order_index: nextOrderIndex,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating action:', error)
      return NextResponse.json(
        { error: 'Failed to create action' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in actions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

