import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'

import LoadingSpinner from '@/components/loading-spinner'

// 动态导入 TemplatesView，优化初始加载
const TemplatesView = dynamic(() => import('@/components/templates-view'), {
  loading: () => <LoadingSpinner message="加载模板..." />,
})

export default async function TemplatesPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login')
  }

  return <TemplatesView />
}

