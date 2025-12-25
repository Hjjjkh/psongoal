import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSystemState, initSystemState } from '@/lib/system-state'
import TodayView from '@/components/today-view'

export default async function TodayPage() {
  const supabase = await createClient()
  
  // 检查认证
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login')
  }

  // 初始化或获取系统状态
  let systemState = await getSystemState(user.id)
  if (!systemState) {
    systemState = await initSystemState(user.id)
  }

  // 【执行力强化】系统异常状态：使用系统语言，而非错误语言
  if (!systemState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">系统状态异常</p>
          <p className="text-muted-foreground">执行被暂停，请刷新页面</p>
        </div>
      </div>
    )
  }

  // 【执行力强化】只获取当前 Action 数据，不查询 execution
  // 所有"是否允许完成"的判断交由后端 API 和 SystemState 处理
  let goal = null
  let phase = null
  let action = null

  if (systemState.current_action_id) {
    // 获取 Action 及其关联数据
    const { data: actionData } = await supabase
      .from('actions')
      .select(`
        *,
        phases!inner(
          *,
          goals!inner(*)
        )
      `)
      .eq('id', systemState.current_action_id)
      .single()

    if (actionData) {
      action = {
        id: actionData.id,
        phase_id: actionData.phase_id,
        title: actionData.title,
        definition: actionData.definition,
        estimated_time: actionData.estimated_time,
        order_index: actionData.order_index,
        completed_at: actionData.completed_at,
        created_at: actionData.created_at,
      }
      phase = actionData.phases
      goal = actionData.phases.goals
    }
  }

  // 【执行力强化】传递 systemState.current_action_id 用于状态判断
  // 如果为 null，表示目标已完成或未设置
  return (
    <TodayView
      goal={goal}
      phase={phase}
      action={action}
      hasCurrentAction={systemState.current_action_id !== null}
    />
  )
}

