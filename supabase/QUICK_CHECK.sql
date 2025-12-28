-- ============================================
-- 快速检查脚本（简化版）
-- 快速验证迁移是否成功
-- ============================================

-- 1. 表是否存在？
SELECT 
  '表检查' as 检查项,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_templates') 
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_template_actions')
    THEN '✓ 通过'
    ELSE '✗ 失败'
  END as 结果;

-- 2. RLS 是否启用？
SELECT 
  'RLS 检查' as 检查项,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = 'goal_templates' AND rowsecurity = TRUE
    ) THEN '✓ 通过'
    ELSE '✗ 失败'
  END as 结果;

-- 3. 策略数量是否足够？
SELECT 
  '策略检查' as 检查项,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'goal_templates') >= 5
      AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'goal_template_actions') >= 5
    THEN '✓ 通过'
    ELSE '✗ 失败'
  END as 结果;

-- 4. 系统模板是否已初始化？
SELECT 
  '系统模板检查' as 检查项,
  CASE 
    WHEN (SELECT COUNT(*) FROM goal_templates WHERE is_system = TRUE) >= 3
    THEN '✓ 已初始化 (' || (SELECT COUNT(*) FROM goal_templates WHERE is_system = TRUE) || ' 个)'
    WHEN (SELECT COUNT(*) FROM goal_templates WHERE is_system = TRUE) > 0
    THEN '⚠ 部分初始化 (' || (SELECT COUNT(*) FROM goal_templates WHERE is_system = TRUE) || ' 个)'
    ELSE '✗ 未初始化'
  END as 结果;

-- 5. 查看系统模板列表
SELECT 
  name as 模板名称,
  category as 分类,
  (SELECT COUNT(*) FROM goal_template_actions WHERE goal_template_id = goal_templates.id) as 行动数量
FROM goal_templates
WHERE is_system = TRUE
ORDER BY category;

