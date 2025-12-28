import { getDatabase, generateId, formatTimestamp } from '../db-utils';
import type { Action } from '@psongoal/core';

export async function getAction(actionId: string, userId: string): Promise<Action | null> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    `SELECT a.* FROM actions a
     INNER JOIN phases p ON a.phase_id = p.id
     INNER JOIN goals g ON p.goal_id = g.id
     WHERE a.id = ? AND g.user_id = ?`,
    [actionId, userId]
  );

  if (results.rows.length === 0) {
    return null;
  }

  const row = results.rows.item(0);
  return {
    id: row.id,
    phase_id: row.phase_id,
    title: row.title,
    definition: row.definition,
    estimated_time: row.estimated_time,
    order_index: row.order_index,
    completed_at: row.completed_at,
    created_at: row.created_at,
  };
}

export async function getActionsByPhase(phaseId: string, userId: string): Promise<Action[]> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    `SELECT a.* FROM actions a
     INNER JOIN phases p ON a.phase_id = p.id
     INNER JOIN goals g ON p.goal_id = g.id
     WHERE a.phase_id = ? AND g.user_id = ?
     ORDER BY a.order_index ASC`,
    [phaseId, userId]
  );

  const actions: Action[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    const row = results.rows.item(i);
    actions.push({
      id: row.id,
      phase_id: row.phase_id,
      title: row.title,
      definition: row.definition,
      estimated_time: row.estimated_time,
      order_index: row.order_index,
      completed_at: row.completed_at,
      created_at: row.created_at,
    });
  }

  return actions;
}

export async function createAction(
  action: Omit<Action, 'id' | 'created_at'>
): Promise<Action | null> {
  const db = await getDatabase();
  const id = generateId();
  const now = formatTimestamp();

  await db.executeSql(
    `INSERT INTO actions (id, phase_id, title, definition, estimated_time, order_index, completed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      action.phase_id,
      action.title,
      action.definition,
      action.estimated_time || null,
      action.order_index,
      action.completed_at || null,
      now,
    ]
  );

  // 获取 userId 来验证
  const [phaseResults] = await db.executeSql(
    `SELECT g.user_id FROM goals g
     INNER JOIN phases p ON g.id = p.goal_id
     WHERE p.id = ?`,
    [action.phase_id]
  );
  const userId = phaseResults.rows.item(0).user_id;

  return getAction(id, userId);
}

export async function updateAction(
  actionId: string,
  userId: string,
  updates: Partial<Action>
): Promise<boolean> {
  const db = await getDatabase();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.definition !== undefined) {
    fields.push('definition = ?');
    values.push(updates.definition);
  }
  if (updates.estimated_time !== undefined) {
    fields.push('estimated_time = ?');
    values.push(updates.estimated_time);
  }
  if (updates.order_index !== undefined) {
    fields.push('order_index = ?');
    values.push(updates.order_index);
  }
  if (updates.completed_at !== undefined) {
    fields.push('completed_at = ?');
    values.push(updates.completed_at);
  }

  if (fields.length === 0) {
    return true;
  }

  values.push(actionId, userId);

  await db.executeSql(
    `UPDATE actions SET ${fields.join(', ')}
     WHERE id = ? AND phase_id IN (
       SELECT p.id FROM phases p
       INNER JOIN goals g ON p.goal_id = g.id
       WHERE g.user_id = ?
     )`,
    values
  );

  return true;
}

export async function deleteAction(actionId: string, userId: string): Promise<boolean> {
  const db = await getDatabase();
  await db.executeSql(
    `DELETE FROM actions
     WHERE id = ? AND phase_id IN (
       SELECT p.id FROM phases p
       INNER JOIN goals g ON p.goal_id = g.id
       WHERE g.user_id = ?
     )`,
    [actionId, userId]
  );
  return true;
}

