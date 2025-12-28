import { getDatabase, generateId, formatTimestamp } from '../db-utils';
import type { Goal } from '@psongoal/core';

export async function getGoal(goalId: string, userId: string): Promise<Goal | null> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    'SELECT * FROM goals WHERE id = ? AND user_id = ?',
    [goalId, userId]
  );

  if (results.rows.length === 0) {
    return null;
  }

  const row = results.rows.item(0);
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    category: row.category,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getGoals(userId: string): Promise<Goal[]> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    'SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  const goals: Goal[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    const row = results.rows.item(i);
    goals.push({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      category: row.category,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  return goals;
}

export async function createGoal(
  goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>
): Promise<Goal | null> {
  const db = await getDatabase();
  const id = generateId();
  const now = formatTimestamp();

  await db.executeSql(
    `INSERT INTO goals (id, user_id, name, category, start_date, end_date, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      goal.user_id,
      goal.name,
      goal.category,
      goal.start_date,
      goal.end_date || null,
      goal.status || 'active',
      now,
      now,
    ]
  );

  return getGoal(id, goal.user_id);
}

export async function updateGoal(
  goalId: string,
  userId: string,
  updates: Partial<Goal>
): Promise<boolean> {
  const db = await getDatabase();
  const now = formatTimestamp();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }
  if (updates.start_date !== undefined) {
    fields.push('start_date = ?');
    values.push(updates.start_date);
  }
  if (updates.end_date !== undefined) {
    fields.push('end_date = ?');
    values.push(updates.end_date);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(goalId, userId);

  await db.executeSql(
    `UPDATE goals SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  );

  return true;
}

export async function deleteGoal(goalId: string, userId: string): Promise<boolean> {
  const db = await getDatabase();
  await db.executeSql('DELETE FROM goals WHERE id = ? AND user_id = ?', [goalId, userId]);
  return true;
}

