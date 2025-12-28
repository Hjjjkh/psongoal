-- 添加行动模板表
-- 用于存储用户自定义的行动模板（仅个人使用，不分享）

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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_action_templates_user_id ON action_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_action_templates_category ON action_templates(category);

-- 启用 RLS
ALTER TABLE action_templates ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的模板
CREATE POLICY "Users can view own templates" ON action_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON action_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON action_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON action_templates
  FOR DELETE USING (auth.uid() = user_id);

-- 创建更新时间触发器
CREATE TRIGGER update_action_templates_updated_at BEFORE UPDATE ON action_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

