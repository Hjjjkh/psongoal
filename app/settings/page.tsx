import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSystemState } from '@/lib/system-state'
import dynamic from 'next/dynamic'

import LoadingSpinner from '@/components/loading-spinner'

// 动态导入 SettingsView，优化初始加载
const SettingsView = dynamic(() => import('@/components/settings-view'), {
  loading: () => <LoadingSpinner message="加载设置..." />,
})

/**
 * 设置页面
 * 集中管理所有系统设置功能
 */
export default async function SettingsPage() {
  const supabase = await createClient()
  
  // 检查认证
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // 获取系统状态（包含提醒设置）
  const systemState = await getSystemState(user.id)

  return (
    <SettingsView
      reminderEnabled={systemState?.reminder_enabled ?? null}
      reminderTime={systemState?.reminder_time ?? null}
    />
  )
}

