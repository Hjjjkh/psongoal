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
    const { goal_id, name, description } = body

    if (!goal_id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 获取当前 goal 的最大 order_index
    const { data: existingPhases } = await supabase
      .from('phases')
      .select('order_index')
      .eq('goal_id', goal_id)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrderIndex = existingPhases && existingPhases.length > 0
      ? existingPhases[0].order_index + 1
      : 1

    const { data, error } = await supabase
      .from('phases')
      .insert({
        goal_id,
        name,
        description: description || null,
        order_index: nextOrderIndex,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating phase:', error)
      return NextResponse.json(
        { error: 'Failed to create phase' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in phases API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

