-- ============================================
-- 修复 todos 表结构
-- 如果表存在但列名不匹配，使用此脚本修复
-- ============================================

-- 检查并添加缺失的列
DO $$ 
BEGIN
  -- 如果 checked 列不存在，添加它
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'checked'
  ) THEN
    -- 如果存在 completed 列，重命名为 checked
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'todos' AND column_name = 'completed'
    ) THEN
      ALTER TABLE todos RENAME COLUMN completed TO checked;
      ALTER TABLE todos RENAME COLUMN completed_at TO checked_at;
    ELSE
      -- 如果不存在 completed 列，直接添加 checked 列
      ALTER TABLE todos ADD COLUMN checked BOOLEAN DEFAULT FALSE;
    END IF;
  END IF;

  -- 如果 checked_at 列不存在，添加它
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'checked_at'
  ) THEN
    -- 如果存在 completed_at 列，重命名
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'todos' AND column_name = 'completed_at'
    ) THEN
      ALTER TABLE todos RENAME COLUMN completed_at TO checked_at;
    ELSE
      -- 如果不存在，直接添加
      ALTER TABLE todos ADD COLUMN checked_at TIMESTAMPTZ;
    END IF;
  END IF;

  -- 确保 expires_at 列存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE todos ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  -- 确保其他必需列存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE todos ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE todos ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 重新创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_checked ON todos(user_id, checked);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_expires_at ON todos(user_id, expires_at);

-- 确保 RLS 已启用
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- 删除旧的策略（如果存在）并重新创建
DROP POLICY IF EXISTS "Users can view their own todos" ON todos;
DROP POLICY IF EXISTS "Users can insert their own todos" ON todos;
DROP POLICY IF EXISTS "Users can update their own todos" ON todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON todos;

-- 重新创建 RLS 策略
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

