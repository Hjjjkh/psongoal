-- ============================================
-- 代办事项表（认知降级版本）
-- 注意：这不是任务系统，只是记忆容器
-- ============================================

-- 创建代办事项表（认知降级版本）
-- 注意：使用 checked 而不是 completed，语义更弱
-- 注意：expires_at 是失效时间（自动清理），不是计划日期
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  checked BOOLEAN DEFAULT FALSE,  -- 改为 checked，表示"处理过"而非"完成"
  checked_at TIMESTAMPTZ,  -- 改为 checked_at，弱化时间语义
  expires_at TIMESTAMPTZ,  -- 失效时间：7天后自动清理（不是计划日期）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_checked ON todos(user_id, checked);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_expires_at ON todos(user_id, expires_at);  -- 用于自动清理过期代办

-- 启用 RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的代办
CREATE POLICY "Users can view their own todos"
  ON todos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own todos"
  ON todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own todos"
  ON todos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own todos"
  ON todos FOR DELETE
  USING (auth.uid() = user_id);

