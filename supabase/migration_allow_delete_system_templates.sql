-- 允许用户删除系统模板
-- 这样用户可以删除系统模板以便重新初始化获取最新版本
-- 
-- 此迁移文件是安全的，它只是更新 RLS 策略以允许删除系统模板
-- 不会删除任何数据，只是修改权限策略

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

