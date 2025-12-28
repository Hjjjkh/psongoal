-- ============================================
-- 专注会话表（从属于 Action/代办）
-- 注意：专注数据永远从属于任务，不能独立叙事
-- ============================================

-- 创建专注会话表
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_id UUID REFERENCES actions(id) ON DELETE CASCADE,  -- 关联 Action（可为空）
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,  -- 关联代办（可为空）
  duration_minutes INTEGER NOT NULL,  -- 专注时长（分钟）
  session_type VARCHAR(20) DEFAULT 'pomodoro',  -- 类型：pomodoro（番茄钟）、custom（自定义）
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_action_id ON focus_sessions(action_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_todo_id ON focus_sessions(todo_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions(user_id, started_at DESC);

-- 启用 RLS
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的专注会话
CREATE POLICY "Users can view their own focus sessions"
  ON focus_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own focus sessions"
  ON focus_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus sessions"
  ON focus_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus sessions"
  ON focus_sessions FOR DELETE
  USING (auth.uid() = user_id);

