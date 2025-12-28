import { createClient } from '@/lib/supabase/server'
import { getUserTodos } from '@/lib/todos'
import { getCurrentAction } from '@/lib/system-state'
import { getToday } from '@/lib/utils/date'
import dynamicImport from 'next/dynamic'

// 动态导入 FocusSpaceView，禁用 SSR 以避免 hydration 错误
const FocusSpaceView = dynamicImport(() => import('@/components/focus-space-view'), {
  ssr: false,
})

/**
 * 独立专注执行空间页面
 * 用户可以随时进入，不限制唯一任务完成状态
 * 可以在这里完成今日唯一任务或代办，专注计时器可选
 * 
 * 【优化】禁用缓存，确保每次访问都获取最新数据
 * 这样完成行动后立即查看，能显示最新的状态
 */
// 【性能优化】使用 ISR，30秒缓存
// 专注空间需要相对实时的数据，但不需要完全禁用缓存
export const revalidate = 0
// 设置为 0 确保数据实时更新，完成操作后立即反映最新状态

export default async function FocusPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>请先登录</p>
      </div>
    )
  }

  // 获取今日唯一任务 Action
  const currentAction = await getCurrentAction(user.id)

  // 【修复】检查今天是否已经完成行动
  // 如果今天已完成，不应该显示行动（与今日页面逻辑一致）
  const today = getToday()
  const { data: todayExecutions } = await supabase
    .from('daily_executions')
    .select('action_id, completed')
    .eq('user_id', user.id)
    .eq('date', today)
    .eq('completed', true)
    .limit(1)

  // 如果今天已完成，清空 action（不显示）
  const todayCompleted = !!(todayExecutions && todayExecutions.length > 0)
  const finalAction = todayCompleted ? null : currentAction?.action || null
  const finalGoal = todayCompleted ? null : currentAction?.goal || null
  const finalPhase = todayCompleted ? null : currentAction?.phase || null

  // 获取代办列表
  const todos = await getUserTodos(user.id)
  const uncheckedTodos = todos.filter(t => !t.checked)

  return (
    <FocusSpaceView
      action={finalAction}
      goal={finalGoal}
      phase={finalPhase}
      todos={uncheckedTodos}
    />
  )
}

