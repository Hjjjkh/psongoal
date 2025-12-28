-- ============================================
-- 安全修复 todos 表结构（只添加，不删除）
-- 此脚本只添加缺失的列，不会删除任何数据或策略
-- ============================================

-- 检查并添加缺失的列（如果不存在）
DO $$ 
BEGIN
  -- 如果 checked 列不存在，添加它
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'checked'
  ) THEN
    -- 如果存在 completed 列，重命名为 checked（保留数据）
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'todos' AND column_name = 'completed'
    ) THEN
      ALTER TABLE todos RENAME COLUMN completed TO checked;
      RAISE NOTICE '已重命名列: completed -> checked';
    ELSE
      -- 如果不存在 completed 列，直接添加 checked 列
      ALTER TABLE todos ADD COLUMN checked BOOLEAN DEFAULT FALSE;
      RAISE NOTICE '已添加列: checked';
    END IF;
  ELSE
    RAISE NOTICE '列 checked 已存在';
  END IF;

  -- 如果 checked_at 列不存在，添加它
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'checked_at'
  ) THEN
    -- 如果存在 completed_at 列，重命名（保留数据）
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'todos' AND column_name = 'completed_at'
    ) THEN
      ALTER TABLE todos RENAME COLUMN completed_at TO checked_at;
      RAISE NOTICE '已重命名列: completed_at -> checked_at';
    ELSE
      -- 如果不存在，直接添加
      ALTER TABLE todos ADD COLUMN checked_at TIMESTAMPTZ;
      RAISE NOTICE '已添加列: checked_at';
    END IF;
  ELSE
    RAISE NOTICE '列 checked_at 已存在';
  END IF;

  -- 确保 expires_at 列存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE todos ADD COLUMN expires_at TIMESTAMPTZ;
    RAISE NOTICE '已添加列: expires_at';
  ELSE
    RAISE NOTICE '列 expires_at 已存在';
  END IF;

  -- 确保其他必需列存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE todos ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '已添加列: created_at';
  ELSE
    RAISE NOTICE '列 created_at 已存在';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE todos ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '已添加列: updated_at';
  ELSE
    RAISE NOTICE '列 updated_at 已存在';
  END IF;
END $$;

-- 创建索引（如果不存在，不会覆盖现有索引）
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_checked ON todos(user_id, checked);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_expires_at ON todos(user_id, expires_at);

-- 确保 RLS 已启用（不会影响现有策略）
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- 创建策略（如果不存在才创建，不会删除现有策略）
DO $$
BEGIN
  -- 检查并创建 SELECT 策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'todos' AND policyname = 'Users can view their own todos'
  ) THEN
    CREATE POLICY "Users can view their own todos"
      ON todos FOR SELECT
      USING (auth.uid() = user_id);
    RAISE NOTICE '已创建策略: Users can view their own todos';
  END IF;

  -- 检查并创建 INSERT 策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'todos' AND policyname = 'Users can insert their own todos'
  ) THEN
    CREATE POLICY "Users can insert their own todos"
      ON todos FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE '已创建策略: Users can insert their own todos';
  END IF;

  -- 检查并创建 UPDATE 策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'todos' AND policyname = 'Users can update their own todos'
  ) THEN
    CREATE POLICY "Users can update their own todos"
      ON todos FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE '已创建策略: Users can update their own todos';
  END IF;

  -- 检查并创建 DELETE 策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'todos' AND policyname = 'Users can delete their own todos'
  ) THEN
    CREATE POLICY "Users can delete their own todos"
      ON todos FOR DELETE
      USING (auth.uid() = user_id);
    RAISE NOTICE '已创建策略: Users can delete their own todos';
  END IF;
END $$;

