import { getDatabase, formatTimestamp } from '../db-utils';
import type { SystemState } from '@psongoal/core';

export async function getSystemState(userId: string): Promise<SystemState | null> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    'SELECT * FROM system_states WHERE user_id = ?',
    [userId]
  );

  if (results.rows.length === 0) {
    return null;
  }

  const row = results.rows.item(0);
  return {
    id: row.id,
    user_id: row.user_id,
    current_goal_id: row.current_goal_id,
    current_phase_id: row.current_phase_id,
    current_action_id: row.current_action_id,
    reminder_enabled: row.reminder_enabled === 1,
    reminder_time: row.reminder_time,
    updated_at: row.updated_at,
  };
}

export async function initSystemState(userId: string): Promise<SystemState | null> {
  const db = await getDatabase();
  const now = formatTimestamp();

  await db.executeSql(
    `INSERT OR IGNORE INTO system_states (id, user_id, updated_at) 
     VALUES (1, ?, ?)`,
    [userId, now]
  );

  return getSystemState(userId);
}

export async function updateSystemState(
  userId: string,
  updates: Partial<SystemState>
): Promise<boolean> {
  const db = await getDatabase();
  const now = formatTimestamp();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.current_goal_id !== undefined) {
    fields.push('current_goal_id = ?');
    values.push(updates.current_goal_id);
  }
  if (updates.current_phase_id !== undefined) {
    fields.push('current_phase_id = ?');
    values.push(updates.current_phase_id);
  }
  if (updates.current_action_id !== undefined) {
    fields.push('current_action_id = ?');
    values.push(updates.current_action_id);
  }
  if (updates.reminder_enabled !== undefined) {
    fields.push('reminder_enabled = ?');
    values.push(updates.reminder_enabled ? 1 : 0);
  }
  if (updates.reminder_time !== undefined) {
    fields.push('reminder_time = ?');
    values.push(updates.reminder_time);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(userId);

  await db.executeSql(
    `UPDATE system_states SET ${fields.join(', ')} WHERE user_id = ?`,
    values
  );

  return true;
}

