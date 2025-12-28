-- ============================================
-- 多阶段模板功能验证脚本
-- 用于验证数据库迁移是否成功
-- ============================================

-- 1. 检查表是否存在
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_template_phases') THEN
    RAISE NOTICE '✓ goal_template_phases 表存在';
  ELSE
    RAISE EXCEPTION '✗ goal_template_phases 表不存在';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_template_actions' AND column_name = 'phase_id') THEN
    RAISE NOTICE '✓ goal_template_actions.phase_id 字段存在';
  ELSE
    RAISE EXCEPTION '✗ goal_template_actions.phase_id 字段不存在';
  END IF;
END $$;

-- 2. 检查索引是否存在
DO $$
DECLARE
  index1_exists BOOLEAN := FALSE;
  index2_exists BOOLEAN := FALSE;
  index3_exists BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_goal_template_phases_template_id') INTO index1_exists;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_goal_template_phases_order') INTO index2_exists;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_goal_template_actions_phase_id') INTO index3_exists;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '索引检查：';
  
  IF index1_exists THEN
    RAISE NOTICE '✓ idx_goal_template_phases_template_id 索引存在';
  ELSE
    RAISE WARNING '✗ idx_goal_template_phases_template_id 索引不存在';
  END IF;
  
  IF index2_exists THEN
    RAISE NOTICE '✓ idx_goal_template_phases_order 索引存在';
  ELSE
    RAISE WARNING '✗ idx_goal_template_phases_order 索引不存在';
  END IF;
  
  IF index3_exists THEN
    RAISE NOTICE '✓ idx_goal_template_actions_phase_id 索引存在';
  ELSE
    RAISE WARNING '✗ idx_goal_template_actions_phase_id 索引不存在';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- 3. 检查 RLS 策略
DO $$
DECLARE
  policy_count INTEGER := 0;
  policy_names TEXT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'goal_template_phases';
  
  SELECT string_agg(policyname, ', ' ORDER BY policyname) INTO policy_names
  FROM pg_policies
  WHERE tablename = 'goal_template_phases';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS 策略检查：';
  
  IF policy_count >= 5 THEN
    RAISE NOTICE '✓ goal_template_phases RLS 策略数量: %', policy_count;
  ELSE
    RAISE WARNING '✗ goal_template_phases RLS 策略数量不足: % (期望至少 5 个)', policy_count;
  END IF;
  
  IF policy_names IS NOT NULL THEN
    RAISE NOTICE '策略列表: %', policy_names;
  ELSE
    RAISE NOTICE '未找到任何策略';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- 4. 检查数据迁移情况
DO $$
DECLARE
  template_count INTEGER := 0;
  phase_count INTEGER := 0;
  action_count INTEGER := 0;
  action_with_phase_count INTEGER := 0;
  action_without_phase_count INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO template_count FROM goal_templates;
  SELECT COUNT(*) INTO phase_count FROM goal_template_phases;
  SELECT COUNT(*) INTO action_count FROM goal_template_actions;
  SELECT COUNT(*) INTO action_with_phase_count FROM goal_template_actions WHERE phase_id IS NOT NULL;
  SELECT COUNT(*) INTO action_without_phase_count FROM goal_template_actions WHERE phase_id IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '数据统计：';
  RAISE NOTICE '模板总数: %', COALESCE(template_count, 0);
  RAISE NOTICE '阶段总数: %', COALESCE(phase_count, 0);
  RAISE NOTICE '行动总数: %', COALESCE(action_count, 0);
  RAISE NOTICE '已关联阶段的行动数: %', COALESCE(action_with_phase_count, 0);
  RAISE NOTICE '未关联阶段的行动数: %', COALESCE(action_without_phase_count, 0);
  RAISE NOTICE '========================================';
  
  -- 验证每个模板至少有一个阶段
  IF template_count = 0 THEN
    RAISE NOTICE '⚠ 当前没有模板数据';
  ELSIF phase_count >= template_count THEN
    RAISE NOTICE '✓ 每个模板都有阶段数据';
  ELSE
    RAISE WARNING '✗ 部分模板没有阶段数据 (模板: %, 阶段: %)', template_count, phase_count;
  END IF;
  
  -- 验证行动关联情况
  IF action_count = 0 THEN
    RAISE NOTICE '⚠ 当前没有行动数据';
  ELSIF action_without_phase_count = 0 THEN
    RAISE NOTICE '✓ 所有行动都已关联到阶段';
  ELSE
    RAISE WARNING '✗ 有 % 个行动未关联到阶段（可能是旧数据）', action_without_phase_count;
  END IF;
END $$;

-- 5. 检查示例数据（如果有）
DO $$
DECLARE
  sample_template_id UUID;
  sample_template_name VARCHAR(255);
  sample_template_category VARCHAR(20);
  phase_count INTEGER;
  action_count INTEGER;
  phase_record RECORD;
BEGIN
  -- 查找第一个模板作为示例
  SELECT id, name, category 
  INTO sample_template_id, sample_template_name, sample_template_category
  FROM goal_templates
  LIMIT 1;
  
  IF sample_template_id IS NOT NULL THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '示例模板检查：';
    RAISE NOTICE '模板 ID: %', sample_template_id;
    RAISE NOTICE '模板名称: %', sample_template_name;
    RAISE NOTICE '模板类别: %', sample_template_category;
    
    -- 检查该模板的阶段
    SELECT COUNT(*) INTO phase_count
    FROM goal_template_phases
    WHERE goal_template_id = sample_template_id;
    
    RAISE NOTICE '阶段数量: %', phase_count;
    
    -- 检查每个阶段的行动
    IF phase_count > 0 THEN
      FOR phase_record IN
        SELECT id, name, order_index
        FROM goal_template_phases
        WHERE goal_template_id = sample_template_id
        ORDER BY order_index
      LOOP
        SELECT COUNT(*) INTO action_count
        FROM goal_template_actions
        WHERE phase_id = phase_record.id;
        
        RAISE NOTICE '  阶段 "%" (order: %): % 个行动', 
          phase_record.name, 
          phase_record.order_index, 
          action_count;
      END LOOP;
    ELSE
      RAISE NOTICE '  该模板没有阶段数据';
    END IF;
    
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '没有找到模板数据，跳过示例检查';
  END IF;
END $$;

-- 6. 验证数据完整性
DO $$
DECLARE
  orphaned_phases INTEGER := 0;
  orphaned_actions INTEGER := 0;
BEGIN
  -- 检查孤立的阶段（关联的模板不存在）
  SELECT COUNT(*) INTO orphaned_phases
  FROM goal_template_phases gtp
  WHERE NOT EXISTS (
    SELECT 1 FROM goal_templates gt
    WHERE gt.id = gtp.goal_template_id
  );
  
  -- 检查孤立的行动（关联的阶段不存在）
  SELECT COUNT(*) INTO orphaned_actions
  FROM goal_template_actions gta
  WHERE gta.phase_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM goal_template_phases gtp
      WHERE gtp.id = gta.phase_id
    );
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '数据完整性检查：';
  
  IF orphaned_phases = 0 THEN
    RAISE NOTICE '✓ 没有孤立的阶段';
  ELSE
    RAISE WARNING '✗ 发现 % 个孤立的阶段', orphaned_phases;
  END IF;
  
  IF orphaned_actions = 0 THEN
    RAISE NOTICE '✓ 没有孤立的行动';
  ELSE
    RAISE WARNING '✗ 发现 % 个孤立的行动', orphaned_actions;
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- 7. 最终验证结果
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '多阶段模板功能验证完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '如果看到所有 ✓ 标记，说明迁移成功';
  RAISE NOTICE '如果有 ✗ 或警告，请检查迁移脚本';
  RAISE NOTICE '========================================';
END $$;

-- 8. 查询语句示例（用于手动验证）
-- 取消注释下面的查询来查看详细数据

-- 查看所有模板及其阶段
/*
SELECT 
  gt.id,
  gt.name AS template_name,
  gt.category,
  COUNT(DISTINCT gtp.id) AS phase_count,
  COUNT(DISTINCT gta.id) AS action_count
FROM goal_templates gt
LEFT JOIN goal_template_phases gtp ON gt.id = gtp.goal_template_id
LEFT JOIN goal_template_actions gta ON gtp.id = gta.phase_id
GROUP BY gt.id, gt.name, gt.category
ORDER BY gt.created_at DESC;
*/

-- 查看特定模板的详细阶段信息（替换 YOUR_TEMPLATE_ID_HERE）
/*
SELECT 
  gtp.id AS phase_id,
  gtp.name AS phase_name,
  gtp.description,
  gtp.order_index,
  COUNT(gta.id) AS action_count
FROM goal_template_phases gtp
LEFT JOIN goal_template_actions gta ON gtp.id = gta.phase_id
WHERE gtp.goal_template_id = 'YOUR_TEMPLATE_ID_HERE'
GROUP BY gtp.id, gtp.name, gtp.description, gtp.order_index
ORDER BY gtp.order_index;
*/

-- 查看所有阶段的详细信息
/*
SELECT 
  gt.name AS template_name,
  gtp.order_index,
  gtp.name AS phase_name,
  COUNT(gta.id) AS action_count
FROM goal_template_phases gtp
JOIN goal_templates gt ON gt.id = gtp.goal_template_id
LEFT JOIN goal_template_actions gta ON gtp.id = gta.phase_id
GROUP BY gt.name, gtp.order_index, gtp.name
ORDER BY gt.name, gtp.order_index;
*/

