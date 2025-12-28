import { createClient } from '@/lib/supabase/server'
import { getUserTodos } from '@/lib/todos'
import { getCurrentAction } from '@/lib/system-state'
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
export const revalidate = 0
export const dynamic = 'force-dynamic'

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

  // 获取代办列表
  const todos = await getUserTodos(user.id)
  const uncheckedTodos = todos.filter(t => !t.checked)

  return (
    <FocusSpaceView
      action={currentAction?.action || null}
      goal={currentAction?.goal || null}
      phase={currentAction?.phase || null}
      todos={uncheckedTodos}
    />
  )
}

