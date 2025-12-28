-- ============================================
-- 目标模板系统完整迁移脚本
-- 包含：表创建、索引、RLS 策略、系统模板初始化
-- ============================================

-- 1. 删除现有策略（如果存在，避免冲突）
DROP POLICY IF EXISTS "Users can view their own goal templates" ON goal_templates;
DROP POLICY IF EXISTS "Users can insert their own goal templates" ON goal_templates;
DROP POLICY IF EXISTS "Users can update their own goal templates" ON goal_templates;
DROP POLICY IF EXISTS "Users can delete their own goal templates" ON goal_templates;
DROP POLICY IF EXISTS "Users can view system goal templates" ON goal_templates;
DROP POLICY IF EXISTS "Users can view their own goal template actions" ON goal_template_actions;
DROP POLICY IF EXISTS "Users can insert their own goal template actions" ON goal_template_actions;
DROP POLICY IF EXISTS "Users can update their own goal template actions" ON goal_template_actions;
DROP POLICY IF EXISTS "Users can delete their own goal template actions" ON goal_template_actions;

-- 2. 创建目标模板表
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

-- 3. 创建目标模板行动关联表
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

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_goal_templates_user_id ON goal_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_templates_category ON goal_templates(category);
CREATE INDEX IF NOT EXISTS idx_goal_templates_is_system ON goal_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_goal_template_actions_template_id ON goal_template_actions(goal_template_id);
CREATE INDEX IF NOT EXISTS idx_goal_template_actions_order ON goal_template_actions(goal_template_id, order_index);

-- 5. 启用 RLS
ALTER TABLE goal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_template_actions ENABLE ROW LEVEL SECURITY;

-- 6. RLS 策略：用户只能访问自己的模板
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

-- 7. RLS 策略：所有用户都可以查看系统模板（重要！）
CREATE POLICY "Users can view system goal templates"
  ON goal_templates FOR SELECT
  USING (is_system = TRUE);

-- 8. RLS 策略：用户只能访问自己模板的行动关联
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

-- 9. RLS 策略：所有用户都可以查看系统模板的行动关联
CREATE POLICY "Users can view system goal template actions"
  ON goal_template_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goal_templates
      WHERE goal_templates.id = goal_template_actions.goal_template_id
      AND goal_templates.is_system = TRUE
    )
  );

-- ============================================
-- 10. 初始化系统默认模板（可选）
-- 注意：这部分需要在实际用户环境中执行，因为需要真实的 user_id
-- 建议通过 API 初始化，而不是直接在这里插入
-- ============================================

-- 如果需要手动初始化系统模板，可以使用以下 SQL（需要替换 user_id）：
/*
-- 获取第一个用户 ID（用于系统模板）
DO $$
DECLARE
  system_user_id UUID;
  health_template_id UUID;
  learning_template_id UUID;
  project_template_id UUID;
BEGIN
  -- 获取第一个用户 ID（或使用固定 UUID）
  SELECT id INTO system_user_id FROM auth.users LIMIT 1;
  
  -- 如果已有系统模板，跳过
  IF EXISTS (SELECT 1 FROM goal_templates WHERE is_system = TRUE LIMIT 1) THEN
    RAISE NOTICE 'System templates already exist, skipping initialization';
    RETURN;
  END IF;
  
  -- 创建健康模板
  INSERT INTO goal_templates (user_id, category, name, phase_name, phase_description, is_system)
  VALUES (
    system_user_id,
    'health',
    '健身目标模板',
    '基础训练阶段',
    '建立基础体能和习惯

**训练原则：**
- 循序渐进，避免过度训练
- 注重动作质量而非数量
- 保持规律性，每周至少 3-4 次',
    TRUE
  )
  RETURNING id INTO health_template_id;
  
  -- 创建健康模板的行动
  INSERT INTO goal_template_actions (goal_template_id, title_template, definition, estimated_time, order_index)
  VALUES
    (health_template_id, '核心训练 Day {n}', '完成 3 组平板支撑，每组 60 秒', 15, 0),
    (health_template_id, '有氧运动 Day {n}', '完成 30 分钟慢跑或快走', 30, 1);
  
  -- 创建学习模板
  INSERT INTO goal_templates (user_id, category, name, phase_name, phase_description, is_system)
  VALUES (
    system_user_id,
    'learning',
    '学习目标模板',
    '基础学习阶段',
    '建立学习习惯和基础知识

**学习方法：**
- 采用主动回忆法，提高记忆效率
- 定期复习，遵循艾宾浩斯遗忘曲线
- 理论与实践相结合',
    TRUE
  )
  RETURNING id INTO learning_template_id;
  
  -- 创建学习模板的行动
  INSERT INTO goal_template_actions (goal_template_id, title_template, definition, estimated_time, order_index)
  VALUES
    (learning_template_id, '学习 Day {n}', '完成 1 小时专注学习，并记录学习笔记', 60, 0),
    (learning_template_id, '复习 Day {n}', '复习前 3 天的学习内容，完成练习题', 45, 1);
  
  -- 创建项目模板
  INSERT INTO goal_templates (user_id, category, name, phase_name, phase_description, is_system)
  VALUES (
    system_user_id,
    'project',
    '项目目标模板',
    '项目启动阶段',
    '完成项目初始化和核心功能

**项目管理要点：**
- 明确项目目标和里程碑
- 每日复盘，及时调整计划
- 保持代码质量和文档同步',
    TRUE
  )
  RETURNING id INTO project_template_id;
  
  -- 创建项目模板的行动
  INSERT INTO goal_template_actions (goal_template_id, title_template, definition, estimated_time, order_index)
  VALUES
    (project_template_id, '项目任务 Day {n}', '完成当日计划的功能开发或任务', 120, 0),
    (project_template_id, '项目复盘 Day {n}', '回顾当日进度，更新项目文档', 30, 1);
  
  RAISE NOTICE 'System templates initialized successfully';
END $$;
*/

-- ============================================
-- 验证脚本
-- ============================================

-- 验证表是否创建成功
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_templates') THEN
    RAISE NOTICE '✓ goal_templates table created';
  ELSE
    RAISE EXCEPTION '✗ goal_templates table not found';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_template_actions') THEN
    RAISE NOTICE '✓ goal_template_actions table created';
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
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'goal_templates';
  
  IF policy_count >= 5 THEN
    RAISE NOTICE '✓ Goal templates policies created: %', policy_count;
  ELSE
    RAISE WARNING '✗ Expected 5 policies, found: %', policy_count;
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
  RAISE NOTICE '========================================';
END $$;

