-- ============================================
-- 多阶段模板支持迁移脚本
-- 将单阶段模板升级为多阶段模板
-- ============================================

-- 1. 创建目标模板阶段表
CREATE TABLE IF NOT EXISTS goal_template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_template_id UUID NOT NULL REFERENCES goal_templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(goal_template_id, order_index)
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_goal_template_phases_template_id ON goal_template_phases(goal_template_id);
CREATE INDEX IF NOT EXISTS idx_goal_template_phases_order ON goal_template_phases(goal_template_id, order_index);

-- 3. 修改 goal_template_actions 表，添加 phase_id 字段
ALTER TABLE goal_template_actions 
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES goal_template_phases(id) ON DELETE CASCADE;

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_goal_template_actions_phase_id ON goal_template_actions(phase_id);

-- 5. 启用 RLS
ALTER TABLE goal_template_phases ENABLE ROW LEVEL SECURITY;

-- 6. 创建 RLS 策略
DO $$
BEGIN
  -- 用户可以查看自己模板的阶段
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_template_phases' 
    AND policyname = 'Users can view their own goal template phases'
  ) THEN
    CREATE POLICY "Users can view their own goal template phases"
      ON goal_template_phases FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM goal_templates
          WHERE goal_templates.id = goal_template_phases.goal_template_id
          AND goal_templates.user_id = auth.uid()
        )
      );
  END IF;

  -- 所有用户都可以查看系统模板的阶段
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_template_phases' 
    AND policyname = 'Users can view system goal template phases'
  ) THEN
    CREATE POLICY "Users can view system goal template phases"
      ON goal_template_phases FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM goal_templates
          WHERE goal_templates.id = goal_template_phases.goal_template_id
          AND goal_templates.is_system = TRUE
        )
      );
  END IF;

  -- 用户可以插入自己模板的阶段
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_template_phases' 
    AND policyname = 'Users can insert their own goal template phases'
  ) THEN
    CREATE POLICY "Users can insert their own goal template phases"
      ON goal_template_phases FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM goal_templates
          WHERE goal_templates.id = goal_template_phases.goal_template_id
          AND goal_templates.user_id = auth.uid()
        )
      );
  END IF;

  -- 用户可以更新自己模板的阶段
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_template_phases' 
    AND policyname = 'Users can update their own goal template phases'
  ) THEN
    CREATE POLICY "Users can update their own goal template phases"
      ON goal_template_phases FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM goal_templates
          WHERE goal_templates.id = goal_template_phases.goal_template_id
          AND goal_templates.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM goal_templates
          WHERE goal_templates.id = goal_template_phases.goal_template_id
          AND goal_templates.user_id = auth.uid()
        )
      );
  END IF;

  -- 用户可以删除自己模板的阶段
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_template_phases' 
    AND policyname = 'Users can delete their own goal template phases'
  ) THEN
    CREATE POLICY "Users can delete their own goal template phases"
      ON goal_template_phases FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM goal_templates
          WHERE goal_templates.id = goal_template_phases.goal_template_id
          AND goal_templates.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 7. 迁移现有数据：将单阶段数据迁移到新表
DO $$
DECLARE
  template_record RECORD;
  phase_id_var UUID;
  existing_phase_count INTEGER;
BEGIN
  -- 遍历所有现有的模板
  FOR template_record IN 
    SELECT id, phase_name, phase_description 
    FROM goal_templates
    WHERE phase_name IS NOT NULL
  LOOP
    -- 检查该模板是否已有阶段数据
    SELECT COUNT(*) INTO existing_phase_count
    FROM goal_template_phases
    WHERE goal_template_id = template_record.id;
    
    -- 如果还没有阶段数据，则创建
    IF existing_phase_count = 0 THEN
      -- 为每个模板创建一个阶段
      INSERT INTO goal_template_phases (goal_template_id, name, description, order_index)
      VALUES (
        template_record.id,
        template_record.phase_name,
        template_record.phase_description,
        0
      )
      RETURNING id INTO phase_id_var;

      -- 将现有的行动关联到新创建的第一个阶段
      UPDATE goal_template_actions
      SET phase_id = phase_id_var
      WHERE goal_template_id = template_record.id
      AND phase_id IS NULL;
    ELSE
      -- 如果已有阶段数据，只更新未关联的行动
      SELECT id INTO phase_id_var
      FROM goal_template_phases
      WHERE goal_template_id = template_record.id
      AND order_index = 0
      LIMIT 1;
      
      IF phase_id_var IS NOT NULL THEN
        -- 将未关联的行动关联到第一个阶段
        UPDATE goal_template_actions
        SET phase_id = phase_id_var
        WHERE goal_template_id = template_record.id
        AND phase_id IS NULL;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE '迁移完成：已将 % 个模板的单阶段数据迁移到新表', (SELECT COUNT(*) FROM goal_template_phases);
END $$;

-- 8. 验证迁移结果
DO $$
DECLARE
  template_count INTEGER;
  phase_count INTEGER;
  action_count INTEGER;
  action_with_phase_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count FROM goal_templates;
  SELECT COUNT(*) INTO phase_count FROM goal_template_phases;
  SELECT COUNT(*) INTO action_count FROM goal_template_actions;
  SELECT COUNT(*) INTO action_with_phase_count FROM goal_template_actions WHERE phase_id IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE '迁移验证结果：';
  RAISE NOTICE '模板总数: %', template_count;
  RAISE NOTICE '阶段总数: %', phase_count;
  RAISE NOTICE '行动总数: %', action_count;
  RAISE NOTICE '已关联阶段的行动数: %', action_with_phase_count;
  RAISE NOTICE '========================================';

  IF phase_count < template_count THEN
    RAISE WARNING '警告：部分模板没有阶段数据';
  END IF;
END $$;

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '多阶段模板迁移完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '注意：';
  RAISE NOTICE '1. goal_templates 表的 phase_name 和 phase_description 字段已保留（向后兼容）';
  RAISE NOTICE '2. 新模板应使用 goal_template_phases 表';
  RAISE NOTICE '3. 现有数据已自动迁移到新表';
  RAISE NOTICE '========================================';
END $$;

