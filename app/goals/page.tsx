import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GoalsView from '@/components/goals-view'

export default async function GoalsPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login')
  }

  // 获取所有 Goals
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // 获取每个 Goal 的 Phases 和 Actions
  const goalsWithDetails = await Promise.all(
    (goals || []).map(async (goal) => {
      const { data: phases } = await supabase
        .from('phases')
        .select('*')
        .eq('goal_id', goal.id)
        .order('order_index', { ascending: true })

      const phasesWithActions = await Promise.all(
        (phases || []).map(async (phase) => {
          const { data: actions } = await supabase
            .from('actions')
            .select('*')
            .eq('phase_id', phase.id)
            .order('order_index', { ascending: true })

          return { ...phase, actions: actions || [] }
        })
      )

      return { ...goal, phases: phasesWithActions }
    })
  )

  return <GoalsView goals={goalsWithDetails || []} />
}

