/**
 * 数据库适配器接口
 * 用于抽象不同平台的数据库操作（Supabase、SQLite等）
 */

import type { Goal, Phase, Action, DailyExecution, SystemState } from './types'

/**
 * 数据库适配器接口
 * 各平台需要实现此接口以支持统一的业务逻辑
 */
export interface DatabaseAdapter {
  // 系统状态管理
  getSystemState(userId: string): Promise<SystemState | null>
  initSystemState(userId: string): Promise<SystemState | null>
  updateSystemState(userId: string, updates: Partial<SystemState>): Promise<boolean>

  // 目标管理
  getGoal(goalId: string, userId: string): Promise<Goal | null>
  getGoals(userId: string): Promise<Goal[]>
  createGoal(goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>): Promise<Goal | null>
  updateGoal(goalId: string, userId: string, updates: Partial<Goal>): Promise<boolean>
  deleteGoal(goalId: string, userId: string): Promise<boolean>

  // 阶段管理
  getPhase(phaseId: string, userId: string): Promise<Phase | null>
  getPhasesByGoal(goalId: string, userId: string): Promise<Phase[]>
  createPhase(phase: Omit<Phase, 'id' | 'created_at'>): Promise<Phase | null>
  updatePhase(phaseId: string, userId: string, updates: Partial<Phase>): Promise<boolean>
  deletePhase(phaseId: string, userId: string): Promise<boolean>

  // 行动管理
  getAction(actionId: string, userId: string): Promise<Action | null>
  getActionsByPhase(phaseId: string, userId: string): Promise<Action[]>
  createAction(action: Omit<Action, 'id' | 'created_at'>): Promise<Action | null>
  updateAction(actionId: string, userId: string, updates: Partial<Action>): Promise<boolean>
  deleteAction(actionId: string, userId: string): Promise<boolean>

  // 执行记录管理
  getDailyExecution(executionId: string, userId: string): Promise<DailyExecution | null>
  getDailyExecutions(userId: string, filters?: {
    actionId?: string
    date?: string
    completed?: boolean
    startDate?: string
    endDate?: string
    limit?: number
  }): Promise<DailyExecution[]>
  createDailyExecution(execution: Omit<DailyExecution, 'id' | 'created_at' | 'updated_at'>): Promise<DailyExecution | null>
  updateDailyExecution(executionId: string, userId: string, updates: Partial<DailyExecution>): Promise<boolean>
  deleteDailyExecution(executionId: string, userId: string): Promise<boolean>

  // 工具方法
  getToday(): string
}

