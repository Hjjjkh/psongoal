-- ============================================
-- 创建行动模板表（安全版，无 DROP 语句）
-- ============================================
-- 这个版本不包含 DROP 语句，避免 Supabase 警告
-- 如果策略或触发器已存在，会报错，但可以忽略
-- ============================================

-- 1. 确保触发器函数存在（如果不存在则创建）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. 创建表
CREATE TABLE IF NOT EXISTS action_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('health', 'learning', 'project', 'custom')),
  title TEXT NOT NULL,
  definition TEXT NOT NULL,
  estimated_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_action_templates_user_id ON action_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_action_templates_category ON action_templates(category);

-- 4. 启用 RLS（行级安全）
ALTER TABLE action_templates ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略
-- 注意：如果策略已存在，会报错，可以忽略或手动删除后重新执行
-- 策略名称必须唯一，如果已存在，需要先删除

-- 查看是否已存在策略（可选，用于检查）
-- SELECT policyname FROM pg_policies WHERE tablename = 'action_templates';

-- 创建策略（如果已存在会报错，可以忽略）
DO $$
BEGIN
  -- 创建 SELECT 策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'action_templates' 
    AND policyname = 'Users can view own templates'
  ) THEN
    CREATE POLICY "Users can view own templates" ON action_templates
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- 创建 INSERT 策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'action_templates' 
    AND policyname = 'Users can insert own templates'
  ) THEN
    CREATE POLICY "Users can insert own templates" ON action_templates
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- 创建 UPDATE 策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'action_templates' 
    AND policyname = 'Users can update own templates'
  ) THEN
    CREATE POLICY "Users can update own templates" ON action_templates
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- 创建 DELETE 策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'action_templates' 
    AND policyname = 'Users can delete own templates'
  ) THEN
    CREATE POLICY "Users can delete own templates" ON action_templates
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 6. 创建更新时间触发器
-- 注意：如果触发器已存在，会报错，可以忽略
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_action_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_action_templates_updated_at BEFORE UPDATE ON action_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- 验证创建结果
-- ============================================
-- 执行以下查询验证：
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'action_templates';
-- SELECT policyname FROM pg_policies WHERE tablename = 'action_templates';

