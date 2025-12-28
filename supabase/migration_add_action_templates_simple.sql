-- ============================================
-- 创建行动模板表（最简单版本，无任何 DROP）
-- ============================================
-- 如果表已存在，不会报错
-- 如果策略已存在，会报错，需要手动删除后重新执行
-- ============================================

-- 1. 确保触发器函数存在
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

-- 4. 启用 RLS
ALTER TABLE action_templates ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略
-- 注意：如果策略已存在，会报错 "policy already exists"
-- 如果报错，说明策略已存在，可以忽略或手动删除后重新执行

CREATE POLICY "Users can view own templates" ON action_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON action_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON action_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON action_templates
  FOR DELETE USING (auth.uid() = user_id);

-- 6. 创建触发器
CREATE TRIGGER update_action_templates_updated_at BEFORE UPDATE ON action_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

