-- ============================================
-- 快速验证迁移结果
-- 执行这个查询来快速检查迁移是否成功
-- ============================================

-- 1. 检查表结构
SELECT 
  '表结构检查' AS 检查项,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_template_phases') 
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_template_actions' AND column_name = 'phase_id')
    THEN '✓ 通过'
    ELSE '✗ 失败'
  END AS 状态;

-- 2. 数据统计
SELECT 
  '模板总数' AS 统计项,
  COUNT(*) AS 数量
FROM goal_templates
UNION ALL
SELECT 
  '阶段总数' AS 统计项,
  COUNT(*) AS 数量
FROM goal_template_phases
UNION ALL
SELECT 
  '行动总数' AS 统计项,
  COUNT(*) AS 数量
FROM goal_template_actions
UNION ALL
SELECT 
  '已关联阶段的行动数' AS 统计项,
  COUNT(*) AS 数量
FROM goal_template_actions
WHERE phase_id IS NOT NULL;

-- 3. 验证每个模板都有阶段
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM goal_template_phases) >= (SELECT COUNT(*) FROM goal_templates)
    THEN '✓ 每个模板都有阶段数据'
    ELSE '✗ 部分模板没有阶段数据'
  END AS 验证结果;

-- 4. 验证所有行动都已关联
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM goal_template_actions WHERE phase_id IS NULL) = 0
    THEN '✓ 所有行动都已关联到阶段'
    ELSE CONCAT('✗ 有 ', (SELECT COUNT(*) FROM goal_template_actions WHERE phase_id IS NULL), ' 个行动未关联')
  END AS 验证结果;

-- 5. 查看示例模板（第一个模板的详细信息）
SELECT 
  gt.name AS 模板名称,
  gt.category AS 类别,
  COUNT(DISTINCT gtp.id) AS 阶段数量,
  COUNT(DISTINCT gta.id) AS 行动数量
FROM goal_templates gt
LEFT JOIN goal_template_phases gtp ON gt.id = gtp.goal_template_id
LEFT JOIN goal_template_actions gta ON gtp.id = gta.phase_id
GROUP BY gt.id, gt.name, gt.category
ORDER BY gt.created_at DESC
LIMIT 5;

