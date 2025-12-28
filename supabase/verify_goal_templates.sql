-- ============================================
-- 目标模板系统验证脚本
-- 用于检查迁移是否成功
-- ============================================

-- 1. 检查表是否存在
SELECT 
  '表检查' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_templates') 
    THEN '✓ goal_templates 表存在'
    ELSE '✗ goal_templates 表不存在'
  END as result
UNION ALL
SELECT 
  '表检查',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_template_actions') 
    THEN '✓ goal_template_actions 表存在'
    ELSE '✗ goal_template_actions 表不存在'
  END;

-- 2. 检查表结构
SELECT 
  '表结构检查' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'goal_templates'
ORDER BY ordinal_position;

-- 3. 检查索引
SELECT 
  '索引检查' as check_type,
  indexname,
  tablename
FROM pg_indexes
WHERE tablename IN ('goal_templates', 'goal_template_actions')
ORDER BY tablename, indexname;

-- 4. 检查 RLS 是否启用
SELECT 
  'RLS 检查' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✓ RLS 已启用'
    ELSE '✗ RLS 未启用'
  END as rls_status
FROM pg_tables
WHERE tablename IN ('goal_templates', 'goal_template_actions')
ORDER BY tablename;

-- 5. 检查 RLS 策略
SELECT 
  '策略检查' as check_type,
  tablename,
  policyname,
  cmd as command,
  CASE 
    WHEN qual IS NOT NULL THEN '✓ 策略已配置'
    ELSE '✗ 策略未配置'
  END as policy_status
FROM pg_policies
WHERE tablename IN ('goal_templates', 'goal_template_actions')
ORDER BY tablename, policyname;

-- 6. 检查策略数量（应该至少有 5 个 goal_templates 策略和 5 个 goal_template_actions 策略）
SELECT 
  '策略数量检查' as check_type,
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN tablename = 'goal_templates' AND COUNT(*) >= 5 THEN '✓ 策略数量正常'
    WHEN tablename = 'goal_template_actions' AND COUNT(*) >= 5 THEN '✓ 策略数量正常'
    ELSE '✗ 策略数量不足'
  END as status
FROM pg_policies
WHERE tablename IN ('goal_templates', 'goal_template_actions')
GROUP BY tablename;

-- 7. 检查是否有系统模板
SELECT 
  '系统模板检查' as check_type,
  COUNT(*) as system_template_count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✓ 系统模板已初始化（' || COUNT(*) || ' 个）'
    WHEN COUNT(*) > 0 THEN '⚠ 部分系统模板已初始化（' || COUNT(*) || ' 个）'
    ELSE '✗ 系统模板未初始化'
  END as status
FROM goal_templates
WHERE is_system = TRUE;

-- 8. 检查系统模板详情
SELECT 
  '系统模板详情' as check_type,
  id,
  name,
  category,
  is_system,
  (SELECT COUNT(*) FROM goal_template_actions WHERE goal_template_id = goal_templates.id) as action_count
FROM goal_templates
WHERE is_system = TRUE
ORDER BY category;

-- 9. 检查系统模板的行动
SELECT 
  '系统模板行动检查' as check_type,
  gt.name as template_name,
  gta.title_template,
  gta.definition,
  gta.estimated_time,
  gta.order_index
FROM goal_templates gt
JOIN goal_template_actions gta ON gt.id = gta.goal_template_id
WHERE gt.is_system = TRUE
ORDER BY gt.category, gta.order_index;

-- 10. 检查用户模板数量（如果有）
SELECT 
  '用户模板检查' as check_type,
  COUNT(*) as user_template_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ 有 ' || COUNT(*) || ' 个用户模板'
    ELSE 'ℹ 暂无用户模板（正常）'
  END as status
FROM goal_templates
WHERE is_system = FALSE;

-- ============================================
-- 总结报告
-- ============================================
DO $$
DECLARE
  table_count INTEGER;
  goal_policy_count INTEGER;
  action_policy_count INTEGER;
  system_template_count INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  -- 检查表
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_name IN ('goal_templates', 'goal_template_actions');
  
  -- 检查策略
  SELECT COUNT(*) INTO goal_policy_count
  FROM pg_policies
  WHERE tablename = 'goal_templates';
  
  SELECT COUNT(*) INTO action_policy_count
  FROM pg_policies
  WHERE tablename = 'goal_template_actions';
  
  -- 检查系统模板
  SELECT COUNT(*) INTO system_template_count
  FROM goal_templates
  WHERE is_system = TRUE;
  
  -- 检查 RLS
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE tablename = 'goal_templates';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '验证报告';
  RAISE NOTICE '========================================';
  RAISE NOTICE '表数量: % (期望: 2)', table_count;
  RAISE NOTICE 'goal_templates 策略数: % (期望: >= 5)', goal_policy_count;
  RAISE NOTICE 'goal_template_actions 策略数: % (期望: >= 5)', action_policy_count;
  RAISE NOTICE '系统模板数量: % (期望: 3)', system_template_count;
  RAISE NOTICE 'RLS 已启用: %', rls_enabled;
  RAISE NOTICE '========================================';
  
  IF table_count = 2 AND goal_policy_count >= 5 AND action_policy_count >= 5 AND rls_enabled THEN
    RAISE NOTICE '✓ 迁移成功！';
    IF system_template_count = 0 THEN
      RAISE NOTICE '⚠ 系统模板未初始化，请执行初始化';
    ELSIF system_template_count >= 3 THEN
      RAISE NOTICE '✓ 系统模板已初始化';
    END IF;
  ELSE
    RAISE WARNING '✗ 迁移可能不完整，请检查上述结果';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

