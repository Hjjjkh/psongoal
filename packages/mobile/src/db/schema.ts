/**
 * SQLite 数据库表结构定义
 */

export const createTablesSQL = `
-- 1. Goal（目标）表
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('health', 'learning', 'project', 'custom')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Phase（阶段）表
CREATE TABLE IF NOT EXISTS phases (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  UNIQUE(goal_id, order_index)
);

-- 3. Action（行动单元）表
CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  phase_id TEXT NOT NULL,
  title TEXT NOT NULL,
  definition TEXT NOT NULL,
  estimated_time INTEGER,
  order_index INTEGER NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE,
  UNIQUE(phase_id, order_index)
);

-- 4. DailyExecution（每日执行记录）表
CREATE TABLE IF NOT EXISTS daily_executions (
  id TEXT PRIMARY KEY,
  action_id TEXT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
  energy INTEGER CHECK (energy >= 1 AND energy <= 5),
  action_title TEXT,
  action_definition TEXT,
  goal_name TEXT,
  phase_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE,
  UNIQUE(action_id, date, user_id)
);

-- 5. SystemState（系统状态，单行）表
CREATE TABLE IF NOT EXISTS system_states (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  user_id TEXT NOT NULL UNIQUE,
  current_goal_id TEXT,
  current_phase_id TEXT,
  current_action_id TEXT,
  reminder_enabled INTEGER,
  reminder_time TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (current_goal_id) REFERENCES goals(id) ON DELETE SET NULL,
  FOREIGN KEY (current_phase_id) REFERENCES phases(id) ON DELETE SET NULL,
  FOREIGN KEY (current_action_id) REFERENCES actions(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_phases_goal_id ON phases(goal_id);
CREATE INDEX IF NOT EXISTS idx_actions_phase_id ON actions(phase_id);
CREATE INDEX IF NOT EXISTS idx_daily_executions_action_id ON daily_executions(action_id);
CREATE INDEX IF NOT EXISTS idx_daily_executions_user_id ON daily_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_executions_date ON daily_executions(date);
CREATE INDEX IF NOT EXISTS idx_system_states_user_id ON system_states(user_id);
`;

