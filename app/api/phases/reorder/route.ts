import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 更新阶段的排序
 * POST /api/phases/reorder
 * Body: { phaseIds: string[] } - 按新顺序排列的阶段 ID 数组
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // 检查认证
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { phaseIds } = await request.json()

    if (!Array.isArray(phaseIds) || phaseIds.length === 0) {
      return NextResponse.json({ error: '无效的请求数据' }, { status: 400 })
    }

    // 验证所有阶段都属于当前用户
    const { data: phases, error: fetchError } = await supabase
      .from('phases')
      .select('id, goal_id')
      .in('id', phaseIds)

    if (fetchError) {
      return NextResponse.json({ error: '获取阶段数据失败' }, { status: 500 })
    }

    // 检查阶段是否属于用户的目标
    const goalIds = [...new Set(phases.map(p => p.goal_id))]
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('id')
      .in('id', goalIds)
      .eq('user_id', user.id)

    if (goalsError || !goals || goals.length !== goalIds.length) {
      return NextResponse.json({ error: '无权访问这些阶段' }, { status: 403 })
    }

    // 批量更新 order_index - 使用 update 而不是 upsert
    // 因为 phases 表有必填字段（goal_id, name），upsert 会失败
    for (let index = 0; index < phaseIds.length; index++) {
      const { error: updateError } = await supabase
        .from('phases')
        .update({ order_index: index + 1 })
        .eq('id', phaseIds[index])
      
      if (updateError) {
        console.error(`Failed to update phase ${phaseIds[index]}:`, updateError)
        return NextResponse.json({ error: '更新排序失败' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reorder phases error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

