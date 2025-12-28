import { getDatabase, generateId, formatTimestamp } from '../db-utils';
import type { DailyExecution } from '@psongoal/core';

export async function getDailyExecution(
  executionId: string,
  userId: string
): Promise<DailyExecution | null> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    'SELECT * FROM daily_executions WHERE id = ? AND user_id = ?',
    [executionId, userId]
  );

  if (results.rows.length === 0) {
    return null;
  }

  const row = results.rows.item(0);
  return {
    id: row.id,
    action_id: row.action_id,
    user_id: row.user_id,
    date: row.date,
    completed: row.completed === 1,
    difficulty: row.difficulty,
    energy: row.energy,
    action_title: row.action_title,
    action_definition: row.action_definition,
    goal_name: row.goal_name,
    phase_name: row.phase_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getDailyExecutions(
  userId: string,
  filters?: {
    actionId?: string;
    date?: string;
    completed?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<DailyExecution[]> {
  const db = await getDatabase();
  let query = 'SELECT * FROM daily_executions WHERE user_id = ?';
  const values: any[] = [userId];

  if (filters?.actionId) {
    query += ' AND action_id = ?';
    values.push(filters.actionId);
  }
  if (filters?.date) {
    query += ' AND date = ?';
    values.push(filters.date);
  }
  if (filters?.completed !== undefined) {
    query += ' AND completed = ?';
    values.push(filters.completed ? 1 : 0);
  }
  if (filters?.startDate) {
    query += ' AND date >= ?';
    values.push(filters.startDate);
  }
  if (filters?.endDate) {
    query += ' AND date <= ?';
    values.push(filters.endDate);
  }

  query += ' ORDER BY date DESC';

  if (filters?.limit) {
    query += ' LIMIT ?';
    values.push(filters.limit);
  }

  const [results] = await db.executeSql(query, values);

  const executions: DailyExecution[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    const row = results.rows.item(i);
    executions.push({
      id: row.id,
      action_id: row.action_id,
      user_id: row.user_id,
      date: row.date,
      completed: row.completed === 1,
      difficulty: row.difficulty,
      energy: row.energy,
      action_title: row.action_title,
      action_definition: row.action_definition,
      goal_name: row.goal_name,
      phase_name: row.phase_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  return executions;
}

export async function createDailyExecution(
  execution: Omit<DailyExecution, 'id' | 'created_at' | 'updated_at'>
): Promise<DailyExecution | null> {
  const db = await getDatabase();
  const id = generateId();
  const now = formatTimestamp();

  await db.executeSql(
    `INSERT INTO daily_executions (
      id, action_id, user_id, date, completed, difficulty, energy,
      action_title, action_definition, goal_name, phase_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      execution.action_id || null,
      execution.user_id,
      execution.date,
      execution.completed ? 1 : 0,
      execution.difficulty || null,
      execution.energy || null,
      execution.action_title || null,
      execution.action_definition || null,
      execution.goal_name || null,
      execution.phase_name || null,
      now,
      now,
    ]
  );

  return getDailyExecution(id, execution.user_id);
}

export async function updateDailyExecution(
  executionId: string,
  userId: string,
  updates: Partial<DailyExecution>
): Promise<boolean> {
  const db = await getDatabase();
  const now = formatTimestamp();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.completed !== undefined) {
    fields.push('completed = ?');
    values.push(updates.completed ? 1 : 0);
  }
  if (updates.difficulty !== undefined) {
    fields.push('difficulty = ?');
    values.push(updates.difficulty);
  }
  if (updates.energy !== undefined) {
    fields.push('energy = ?');
    values.push(updates.energy);
  }
  if (updates.action_title !== undefined) {
    fields.push('action_title = ?');
    values.push(updates.action_title);
  }
  if (updates.action_definition !== undefined) {
    fields.push('action_definition = ?');
    values.push(updates.action_definition);
  }
  if (updates.goal_name !== undefined) {
    fields.push('goal_name = ?');
    values.push(updates.goal_name);
  }
  if (updates.phase_name !== undefined) {
    fields.push('phase_name = ?');
    values.push(updates.phase_name);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(executionId, userId);

  await db.executeSql(
    `UPDATE daily_executions SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  );

  return true;
}

export async function deleteDailyExecution(
  executionId: string,
  userId: string
): Promise<boolean> {
  const db = await getDatabase();
  await db.executeSql('DELETE FROM daily_executions WHERE id = ? AND user_id = ?', [
    executionId,
    userId,
  ]);
  return true;
}

