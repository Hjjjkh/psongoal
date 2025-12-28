-- 创建目标模板表
CREATE TABLE IF NOT EXISTS goal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('health', 'learning', 'project', 'custom')),
  name VARCHAR(255) NOT NULL,
  phase_name VARCHAR(255) NOT NULL,
  phase_description TEXT,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建目标模板行动关联表（目标模板可以引用行动模板）
CREATE TABLE IF NOT EXISTS goal_template_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_template_id UUID NOT NULL REFERENCES goal_templates(id) ON DELETE CASCADE,
  action_template_id UUID REFERENCES action_templates(id) ON DELETE SET NULL,
  title_template VARCHAR(255) NOT NULL,
  definition TEXT NOT NULL,
  estimated_time INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_goal_templates_user_id ON goal_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_templates_category ON goal_templates(category);
CREATE INDEX IF NOT EXISTS idx_goal_templates_is_system ON goal_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_goal_template_actions_template_id ON goal_template_actions(goal_template_id);
CREATE INDEX IF NOT EXISTS idx_goal_template_actions_order ON goal_template_actions(goal_template_id, order_index);

-- 启用 RLS
ALTER TABLE goal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_template_actions ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的模板
CREATE POLICY "Users can view their own goal templates"
  ON goal_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goal templates"
  ON goal_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goal templates"
  ON goal_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goal templates"
  ON goal_templates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS 策略：用户只能访问自己模板的行动关联
CREATE POLICY "Users can view their own goal template actions"
  ON goal_template_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goal_templates
      WHERE goal_templates.id = goal_template_actions.goal_template_id
      AND goal_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own goal template actions"
  ON goal_template_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goal_templates
      WHERE goal_templates.id = goal_template_actions.goal_template_id
      AND goal_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own goal template actions"
  ON goal_template_actions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM goal_templates
      WHERE goal_templates.id = goal_template_actions.goal_template_id
      AND goal_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own goal template actions"
  ON goal_template_actions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM goal_templates
      WHERE goal_templates.id = goal_template_actions.goal_template_id
      AND goal_templates.user_id = auth.uid()
    )
  );

-- 系统模板策略：所有用户都可以查看系统模板
CREATE POLICY "Users can view system goal templates"
  ON goal_templates FOR SELECT
  USING (is_system = TRUE);

