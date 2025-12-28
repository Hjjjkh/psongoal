-- ============================================
-- 目标模板系统安全迁移脚本（无破坏性操作）
-- 包含：表创建、索引、RLS 策略
-- ============================================

-- 1. 创建目标模板表
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

-- 2. 创建目标模板行动关联表
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

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_goal_templates_user_id ON goal_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_templates_category ON goal_templates(category);
CREATE INDEX IF NOT EXISTS idx_goal_templates_is_system ON goal_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_goal_template_actions_template_id ON goal_template_actions(goal_template_id);
CREATE INDEX IF NOT EXISTS idx_goal_template_actions_order ON goal_template_actions(goal_template_id, order_index);

-- 4. 启用 RLS
ALTER TABLE goal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_template_actions ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略（如果不存在则创建，如果存在则跳过）
-- 注意：PostgreSQL 不支持 CREATE POLICY IF NOT EXISTS，所以使用 DO 块来检查

DO $$
BEGIN
  -- 用户只能访问自己的模板
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_templates' 
    AND policyname = 'Users can view their own goal templates'
  ) THEN
    CREATE POLICY "Users can view their own goal templates"
      ON goal_templates FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_templates' 
    AND policyname = 'Users can insert their own goal templates'
  ) THEN
    CREATE POLICY "Users can insert their own goal templates"
      ON goal_templates FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_templates' 
    AND policyname = 'Users can update their own goal templates'
  ) THEN
    CREATE POLICY "Users can update their own goal templates"
      ON goal_templates FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_templates' 
    AND policyname = 'Users can delete their own goal templates'
  ) THEN
    CREATE POLICY "Users can delete their own goal templates"
      ON goal_templates FOR DELETE
      USING (auth.uid() = user_id);
  END IF;

  -- 所有用户都可以查看系统模板（重要！）
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_templates' 
    AND policyname = 'Users can view system goal templates'
  ) THEN
    CREATE POLICY "Users can view system goal templates"
      ON goal_templates FOR SELECT
      USING (is_system = TRUE);
  END IF;

  -- 用户只能访问自己模板的行动关联
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_template_actions' 
    AND policyname = 'Users can view their own goal template actions'
  ) THEN
    CREATE POLICY "Users can view their own goal template actions"
      ON goal_template_actions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM goal_templates
          WHERE goal_templates.id = goal_template_actions.goal_template_id
          AND goal_templates.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_template_actions' 
    AND policyname = 'Users can insert their own goal template actions'
  ) THEN
    CREATE POLICY "Users can insert their own goal template actions"
      ON goal_template_actions FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM goal_templates
          WHERE goal_templates.id = goal_template_actions.goal_template_id
          AND goal_templates.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_template_actions' 
    AND policyname = 'Users can update their own goal template actions'
  ) THEN
    CREATE POLICY "Users can update their own goal template actions"
      ON goal_template_actions FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM goal_templates
          WHERE goal_templates.id = goal_template_actions.goal_template_id
          AND goal_templates.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_template_actions' 
    AND policyname = 'Users can delete their own goal template actions'
  ) THEN
    CREATE POLICY "Users can delete their own goal template actions"
      ON goal_template_actions FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM goal_templates
          WHERE goal_templates.id = goal_template_actions.goal_template_id
          AND goal_templates.user_id = auth.uid()
        )
      );
  END IF;

  -- 所有用户都可以查看系统模板的行动关联
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_template_actions' 
    AND policyname = 'Users can view system goal template actions'
  ) THEN
    CREATE POLICY "Users can view system goal template actions"
      ON goal_template_actions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM goal_templates
          WHERE goal_templates.id = goal_template_actions.goal_template_id
          AND goal_templates.is_system = TRUE
        )
      );
  END IF;
END $$;

-- ============================================
-- 验证脚本
-- ============================================

-- 验证表是否创建成功
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_templates') THEN
    RAISE NOTICE '✓ goal_templates table exists';
  ELSE
    RAISE EXCEPTION '✗ goal_templates table not found';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_template_actions') THEN
    RAISE NOTICE '✓ goal_template_actions table exists';
  ELSE
    RAISE EXCEPTION '✗ goal_template_actions table not found';
  END IF;
END $$;

-- 验证 RLS 是否启用
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'goal_templates' 
    AND rowsecurity = TRUE
  ) THEN
    RAISE NOTICE '✓ RLS enabled on goal_templates';
  ELSE
    RAISE WARNING '✗ RLS not enabled on goal_templates';
  END IF;
END $$;

-- 验证策略数量
DO $$
DECLARE
  goal_policy_count INTEGER;
  action_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO goal_policy_count
  FROM pg_policies
  WHERE tablename = 'goal_templates';
  
  SELECT COUNT(*) INTO action_policy_count
  FROM pg_policies
  WHERE tablename = 'goal_template_actions';
  
  IF goal_policy_count >= 5 THEN
    RAISE NOTICE '✓ Goal templates policies: %', goal_policy_count;
  ELSE
    RAISE WARNING '✗ Expected at least 5 goal template policies, found: %', goal_policy_count;
  END IF;
  
  IF action_policy_count >= 5 THEN
    RAISE NOTICE '✓ Goal template actions policies: %', action_policy_count;
  ELSE
    RAISE WARNING '✗ Expected at least 5 action policies, found: %', action_policy_count;
  END IF;
END $$;

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '目标模板系统迁移完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '1. 在应用中点击"初始化默认模板"按钮';
  RAISE NOTICE '2. 或使用 API: POST /api/goal-templates/init-defaults';
  RAISE NOTICE '3. 或执行: supabase/init_system_goal_templates.sql';
  RAISE NOTICE '========================================';
END $$;

