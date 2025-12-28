-- ============================================
-- 创建行动模板表（完整版，包含所有依赖）
-- ============================================
-- 如果 update_updated_at_column 函数不存在，先创建它
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

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_action_templates_user_id ON action_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_action_templates_category ON action_templates(category);

-- 4. 启用 RLS（行级安全）
ALTER TABLE action_templates ENABLE ROW LEVEL SECURITY;

-- 5. 删除已存在的策略（如果存在，避免重复创建错误）
DROP POLICY IF EXISTS "Users can view own templates" ON action_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON action_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON action_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON action_templates;

-- 6. 创建 RLS 策略
CREATE POLICY "Users can view own templates" ON action_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON action_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON action_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON action_templates
  FOR DELETE USING (auth.uid() = user_id);

-- 7. 删除已存在的触发器（如果存在）
DROP TRIGGER IF EXISTS update_action_templates_updated_at ON action_templates;

-- 8. 创建更新时间触发器
CREATE TRIGGER update_action_templates_updated_at BEFORE UPDATE ON action_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 验证创建结果
-- ============================================
-- 执行以下查询验证：
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'action_templates';
-- SELECT policyname FROM pg_policies WHERE tablename = 'action_templates';

