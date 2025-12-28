/**
 * SQLite 数据库适配器
 * 实现 DatabaseAdapter 接口
 */

import type { DatabaseAdapter } from '@psongoal/core';
import type { Goal, Phase, Action, DailyExecution, SystemState } from '@psongoal/core';
import { getDatabase, generateId, getToday, formatDate, formatTimestamp } from './db-utils';
import { createTablesSQL } from './schema';
import * as SystemStateOps from './operations/system-state';
import * as GoalOps from './operations/goal';
import * as PhaseOps from './operations/phase';
import * as ActionOps from './operations/action';
import * as ExecutionOps from './operations/execution';

let initialized = false;

const initDatabase = async (): Promise<void> => {
  if (initialized) return;
  
  const db = await getDatabase();
  await db.executeSql(createTablesSQL);
  initialized = true;
};

export class SQLiteAdapter implements DatabaseAdapter {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async ensureInitialized(): Promise<void> {
    await initDatabase();
  }

  // 系统状态管理
  async getSystemState(userId: string): Promise<SystemState | null> {
    await this.ensureInitialized();
    return SystemStateOps.getSystemState(userId);
  }

  async initSystemState(userId: string): Promise<SystemState | null> {
    await this.ensureInitialized();
    return SystemStateOps.initSystemState(userId);
  }

  async updateSystemState(userId: string, updates: Partial<SystemState>): Promise<boolean> {
    await this.ensureInitialized();
    return SystemStateOps.updateSystemState(userId, updates);
  }

  // 目标管理
  async getGoal(goalId: string, userId: string): Promise<Goal | null> {
    await this.ensureInitialized();
    return GoalOps.getGoal(goalId, userId);
  }

  async getGoals(userId: string): Promise<Goal[]> {
    await this.ensureInitialized();
    return GoalOps.getGoals(userId);
  }

  async createGoal(goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>): Promise<Goal | null> {
    await this.ensureInitialized();
    return GoalOps.createGoal(goal);
  }

  async updateGoal(goalId: string, userId: string, updates: Partial<Goal>): Promise<boolean> {
    await this.ensureInitialized();
    return GoalOps.updateGoal(goalId, userId, updates);
  }

  async deleteGoal(goalId: string, userId: string): Promise<boolean> {
    await this.ensureInitialized();
    return GoalOps.deleteGoal(goalId, userId);
  }

  // 阶段管理
  async getPhase(phaseId: string, userId: string): Promise<Phase | null> {
    await this.ensureInitialized();
    return PhaseOps.getPhase(phaseId, userId);
  }

  async getPhasesByGoal(goalId: string, userId: string): Promise<Phase[]> {
    await this.ensureInitialized();
    return PhaseOps.getPhasesByGoal(goalId, userId);
  }

  async createPhase(phase: Omit<Phase, 'id' | 'created_at'>): Promise<Phase | null> {
    await this.ensureInitialized();
    return PhaseOps.createPhase(phase);
  }

  async updatePhase(phaseId: string, userId: string, updates: Partial<Phase>): Promise<boolean> {
    await this.ensureInitialized();
    return PhaseOps.updatePhase(phaseId, userId, updates);
  }

  async deletePhase(phaseId: string, userId: string): Promise<boolean> {
    await this.ensureInitialized();
    return PhaseOps.deletePhase(phaseId, userId);
  }

  // 行动管理
  async getAction(actionId: string, userId: string): Promise<Action | null> {
    await this.ensureInitialized();
    return ActionOps.getAction(actionId, userId);
  }

  async getActionsByPhase(phaseId: string, userId: string): Promise<Action[]> {
    await this.ensureInitialized();
    return ActionOps.getActionsByPhase(phaseId, userId);
  }

  async createAction(action: Omit<Action, 'id' | 'created_at'>): Promise<Action | null> {
    await this.ensureInitialized();
    return ActionOps.createAction(action);
  }

  async updateAction(actionId: string, userId: string, updates: Partial<Action>): Promise<boolean> {
    await this.ensureInitialized();
    return ActionOps.updateAction(actionId, userId, updates);
  }

  async deleteAction(actionId: string, userId: string): Promise<boolean> {
    await this.ensureInitialized();
    return ActionOps.deleteAction(actionId, userId);
  }

  // 执行记录管理
  async getDailyExecution(executionId: string, userId: string): Promise<DailyExecution | null> {
    await this.ensureInitialized();
    return ExecutionOps.getDailyExecution(executionId, userId);
  }

  async getDailyExecutions(userId: string, filters?: {
    actionId?: string;
    date?: string;
    completed?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<DailyExecution[]> {
    await this.ensureInitialized();
    return ExecutionOps.getDailyExecutions(userId, filters);
  }

  async createDailyExecution(execution: Omit<DailyExecution, 'id' | 'created_at' | 'updated_at'>): Promise<DailyExecution | null> {
    await this.ensureInitialized();
    return ExecutionOps.createDailyExecution(execution);
  }

  async updateDailyExecution(executionId: string, userId: string, updates: Partial<DailyExecution>): Promise<boolean> {
    await this.ensureInitialized();
    return ExecutionOps.updateDailyExecution(executionId, userId, updates);
  }

  async deleteDailyExecution(executionId: string, userId: string): Promise<boolean> {
    await this.ensureInitialized();
    return ExecutionOps.deleteDailyExecution(executionId, userId);
  }

  // 工具方法
  getToday(): string {
    return getToday();
  }
}

