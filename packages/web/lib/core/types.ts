export type GoalCategory = 'health' | 'learning' | 'project' | 'custom'
export type GoalStatus = 'active' | 'paused' | 'completed'

export interface Goal {
  id: string
  user_id: string
  name: string
  category: GoalCategory
  start_date: string
  end_date: string | null
  status: GoalStatus
  created_at: string
  updated_at: string
}

export interface Phase {
  id: string
  goal_id: string
  name: string
  order_index: number
  description: string | null
  created_at: string
}

export interface Action {
  id: string
  phase_id: string
  title: string
  definition: string
  estimated_time: number | null
  order_index: number
  completed_at: string | null  // 新增：Action 完成日期，非空即视为永久完成
  created_at: string
}

export interface DailyExecution {
  id: string
  action_id: string
  user_id: string
  date: string
  completed: boolean
  difficulty: number | null
  energy: number | null
  created_at: string
  updated_at: string
}

export interface SystemState {
  id: number
  user_id: string
  current_goal_id: string | null
  current_phase_id: string | null
  current_action_id: string | null
  reminder_enabled: boolean | null
  reminder_time: string | null
  updated_at: string
}

export interface TodayViewData {
  goal: Goal | null
  phase: Phase | null
  action: Action | null
  execution: DailyExecution | null
}

