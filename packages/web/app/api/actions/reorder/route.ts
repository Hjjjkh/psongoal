import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 更新行动的排序
 * POST /api/actions/reorder
 * Body: { actionIds: string[] } - 按新顺序排列的行动 ID 数组
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // 检查认证
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { actionIds } = await request.json()

    if (!Array.isArray(actionIds) || actionIds.length === 0) {
      return NextResponse.json({ error: '无效的请求数据' }, { status: 400 })
    }

    // 验证所有行动都属于当前用户
    const { data: actions, error: fetchError } = await supabase
      .from('actions')
      .select('id, phase_id')
      .in('id', actionIds)

    if (fetchError) {
      return NextResponse.json({ error: '获取行动数据失败' }, { status: 500 })
    }

    // 检查是否所有行动都被找到
    if (!actions || actions.length !== actionIds.length) {
      return NextResponse.json({ error: '部分行动不存在或无权访问' }, { status: 403 })
    }

    // 检查行动是否属于用户的阶段
    const phaseIds = [...new Set(actions.map(a => a.phase_id))]
    const { data: phases, error: phasesError } = await supabase
      .from('phases')
      .select('id, goal_id')
      .in('id', phaseIds)

    if (phasesError) {
      return NextResponse.json({ error: '获取阶段数据失败' }, { status: 500 })
    }

    const goalIds = [...new Set(phases.map(p => p.goal_id))]
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('id')
      .in('id', goalIds)
      .eq('user_id', user.id)

    if (goalsError || !goals || goals.length !== goalIds.length) {
      return NextResponse.json({ error: '无权访问这些行动' }, { status: 403 })
    }

    // 【修复UNIQUE约束冲突】分两步更新order_index
    // 问题：actions表有UNIQUE(phase_id, order_index)约束，直接更新会导致冲突
    // 解决：先设置所有order_index为临时值（负数），再设置最终值
    
    // 第一步：设置所有order_index为临时值（负数，避免与现有值冲突）
    for (let index = 0; index < actionIds.length; index++) {
      const { error: tempUpdateError } = await supabase
        .from('actions')
        .update({ order_index: -(index + 1) }) // 使用负数作为临时值
        .eq('id', actionIds[index])
      
      if (tempUpdateError) {
        console.error(`Failed to set temp order_index for action ${actionIds[index]}:`, tempUpdateError)
        return NextResponse.json({ 
          error: '更新排序失败', 
          details: tempUpdateError.message 
        }, { status: 500 })
      }
    }
    
    // 第二步：设置所有order_index为最终值
    for (let index = 0; index < actionIds.length; index++) {
      const { error: updateError } = await supabase
        .from('actions')
        .update({ order_index: index + 1 })
        .eq('id', actionIds[index])
      
      if (updateError) {
        console.error(`Failed to update action ${actionIds[index]}:`, updateError)
        return NextResponse.json({ 
          error: '更新排序失败', 
          details: updateError.message 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reorder actions error:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json({ 
      error: '服务器错误', 
      details: errorMessage 
    }, { status: 500 })
  }
}

