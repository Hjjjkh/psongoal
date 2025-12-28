-- ============================================
-- 个人目标执行系统 (PES) 数据库结构
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Goal（目标）表
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('health', 'learning', 'project')),
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Phase（阶段）表
CREATE TABLE IF NOT EXISTS phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(goal_id, order_index)
);

-- 3. Action（行动单元）表
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  definition TEXT NOT NULL, -- 完成标准，必须是客观可判断的
  estimated_time INTEGER, -- 分钟
  order_index INTEGER NOT NULL,
  completed_at DATE NULL, -- 【执行力增强】Action 完成日期，非空即视为永久完成，推进逻辑的唯一真相源
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(phase_id, order_index)
);

-- 4. DailyExecution（每日执行记录）表
CREATE TABLE IF NOT EXISTS daily_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
  energy INTEGER CHECK (energy >= 1 AND energy <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(action_id, date, user_id)
);

-- 5. SystemState（系统状态，单行）表
CREATE TABLE IF NOT EXISTS system_states (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  current_phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
  current_action_id UUID REFERENCES actions(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_phases_goal_id ON phases(goal_id);
CREATE INDEX IF NOT EXISTS idx_actions_phase_id ON actions(phase_id);
CREATE INDEX IF NOT EXISTS idx_daily_executions_action_id ON daily_executions(action_id);
CREATE INDEX IF NOT EXISTS idx_daily_executions_user_id ON daily_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_executions_date ON daily_executions(date);
CREATE INDEX IF NOT EXISTS idx_system_states_user_id ON system_states(user_id);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要自动更新时间的表创建触发器
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_executions_updated_at BEFORE UPDATE ON daily_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_states_updated_at BEFORE UPDATE ON system_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用 Row Level Security (RLS)
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_states ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的数据
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own phases" ON phases
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM goals WHERE goals.id = phases.goal_id AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own phases" ON phases
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM goals WHERE goals.id = phases.goal_id AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own phases" ON phases
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM goals WHERE goals.id = phases.goal_id AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own phases" ON phases
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM goals WHERE goals.id = phases.goal_id AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own actions" ON actions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM phases 
    JOIN goals ON goals.id = phases.goal_id 
    WHERE phases.id = actions.phase_id AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own actions" ON actions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM phases 
    JOIN goals ON goals.id = phases.goal_id 
    WHERE phases.id = actions.phase_id AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own actions" ON actions
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM phases 
    JOIN goals ON goals.id = phases.goal_id 
    WHERE phases.id = actions.phase_id AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own actions" ON actions
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM phases 
    JOIN goals ON goals.id = phases.goal_id 
    WHERE phases.id = actions.phase_id AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own executions" ON daily_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own executions" ON daily_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own executions" ON daily_executions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own executions" ON daily_executions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own system state" ON system_states
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own system state" ON system_states
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own system state" ON system_states
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own system state" ON system_states
  FOR DELETE USING (auth.uid() = user_id);

