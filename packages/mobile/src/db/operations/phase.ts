import { getDatabase, generateId, formatTimestamp } from '../db-utils';
import type { Phase } from '@psongoal/core';

export async function getPhase(phaseId: string, userId: string): Promise<Phase | null> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    `SELECT p.* FROM phases p
     INNER JOIN goals g ON p.goal_id = g.id
     WHERE p.id = ? AND g.user_id = ?`,
    [phaseId, userId]
  );

  if (results.rows.length === 0) {
    return null;
  }

  const row = results.rows.item(0);
  return {
    id: row.id,
    goal_id: row.goal_id,
    name: row.name,
    order_index: row.order_index,
    description: row.description,
    created_at: row.created_at,
  };
}

export async function getPhasesByGoal(goalId: string, userId: string): Promise<Phase[]> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    `SELECT p.* FROM phases p
     INNER JOIN goals g ON p.goal_id = g.id
     WHERE p.goal_id = ? AND g.user_id = ?
     ORDER BY p.order_index ASC`,
    [goalId, userId]
  );

  const phases: Phase[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    const row = results.rows.item(i);
    phases.push({
      id: row.id,
      goal_id: row.goal_id,
      name: row.name,
      order_index: row.order_index,
      description: row.description,
      created_at: row.created_at,
    });
  }

  return phases;
}

export async function createPhase(
  phase: Omit<Phase, 'id' | 'created_at'>
): Promise<Phase | null> {
  const db = await getDatabase();
  const id = generateId();
  const now = formatTimestamp();

  await db.executeSql(
    `INSERT INTO phases (id, goal_id, name, order_index, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      phase.goal_id,
      phase.name,
      phase.order_index,
      phase.description || null,
      now,
    ]
  );

  // 获取 userId 来验证
  const [goalResults] = await db.executeSql('SELECT user_id FROM goals WHERE id = ?', [phase.goal_id]);
  const userId = goalResults.rows.item(0).user_id;

  return getPhase(id, userId);
}

export async function updatePhase(
  phaseId: string,
  userId: string,
  updates: Partial<Phase>
): Promise<boolean> {
  const db = await getDatabase();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.order_index !== undefined) {
    fields.push('order_index = ?');
    values.push(updates.order_index);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }

  if (fields.length === 0) {
    return true;
  }

  values.push(phaseId, userId);

  await db.executeSql(
    `UPDATE phases SET ${fields.join(', ')}
     WHERE id = ? AND goal_id IN (SELECT id FROM goals WHERE user_id = ?)`,
    values
  );

  return true;
}

export async function deletePhase(phaseId: string, userId: string): Promise<boolean> {
  const db = await getDatabase();
  await db.executeSql(
    `DELETE FROM phases
     WHERE id = ? AND goal_id IN (SELECT id FROM goals WHERE user_id = ?)`,
    [phaseId, userId]
  );
  return true;
}

