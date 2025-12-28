-- ============================================
-- 允许用户删除系统模板 - 可直接执行的 SQL
-- ============================================
-- 说明：此 SQL 允许用户删除系统模板，以便重新初始化获取最新版本
-- 安全性：只修改权限策略，不会删除任何数据
-- 
-- 使用方法：
-- 1. 复制下面的所有 SQL 代码
-- 2. 在 Supabase Dashboard 中打开 SQL Editor
-- 3. 粘贴 SQL 代码
-- 4. 点击 "Run" 执行
-- ============================================

-- 检查并更新 goal_templates 的删除策略
DO $$
BEGIN
  -- 如果旧策略存在，先删除
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'goal_templates' 
    AND policyname = 'Users can delete their own goal templates'
  ) THEN
    DROP POLICY "Users can delete their own goal templates" ON goal_templates;
    RAISE NOTICE '已删除旧策略: Users can delete their own goal templates';
  END IF;

  -- 创建新策略（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'goal_templates' 
    AND policyname = 'Users can delete their own or system goal templates'
  ) THEN
    CREATE POLICY "Users can delete their own or system goal templates"
      ON goal_templates FOR DELETE
      USING (
        auth.uid() = user_id OR is_system = TRUE
      );
    RAISE NOTICE '已创建新策略: Users can delete their own or system goal templates';
  ELSE
    RAISE NOTICE '策略已存在: Users can delete their own or system goal templates';
  END IF;
END $$;

-- 检查并更新 goal_template_actions 的删除策略
DO $$
BEGIN
  -- 如果旧策略存在，先删除
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'goal_template_actions' 
    AND policyname = 'Users can delete their own goal template actions'
  ) THEN
    DROP POLICY "Users can delete their own goal template actions" ON goal_template_actions;
    RAISE NOTICE '已删除旧策略: Users can delete their own goal template actions';
  END IF;

  -- 创建新策略（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'goal_template_actions' 
    AND policyname = 'Users can delete their own or system goal template actions'
  ) THEN
    CREATE POLICY "Users can delete their own or system goal template actions"
      ON goal_template_actions FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM goal_templates
          WHERE goal_templates.id = goal_template_actions.goal_template_id
          AND (goal_templates.user_id = auth.uid() OR goal_templates.is_system = TRUE)
        )
      );
    RAISE NOTICE '已创建新策略: Users can delete their own or system goal template actions';
  ELSE
    RAISE NOTICE '策略已存在: Users can delete their own or system goal template actions';
  END IF;
END $$;

-- 验证策略是否创建成功
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('goal_templates', 'goal_template_actions')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;

