-- ============================================
-- 检查模板阶段数据
-- 用于诊断为什么模板显示为单阶段
-- ============================================

-- 1. 检查所有模板及其阶段数量
SELECT 
  gt.id AS 模板ID,
  gt.name AS 模板名称,
  gt.category AS 类别,
  gt.phase_name AS 向后兼容阶段名,
  COUNT(DISTINCT gtp.id) AS 阶段数量,
  COUNT(DISTINCT gta.id) AS 行动数量
FROM goal_templates gt
LEFT JOIN goal_template_phases gtp ON gt.id = gtp.goal_template_id
LEFT JOIN goal_template_actions gta ON gtp.id = gta.phase_id
GROUP BY gt.id, gt.name, gt.category, gt.phase_name
ORDER BY gt.created_at DESC;

-- 2. 检查哪些模板没有阶段数据
SELECT 
  gt.id AS 模板ID,
  gt.name AS 模板名称,
  gt.category AS 类别,
  '✗ 没有阶段数据' AS 状态
FROM goal_templates gt
WHERE NOT EXISTS (
  SELECT 1 FROM goal_template_phases gtp
  WHERE gtp.goal_template_id = gt.id
)
ORDER BY gt.created_at DESC;

-- 3. 检查哪些模板有多个阶段
SELECT 
  gt.id AS 模板ID,
  gt.name AS 模板名称,
  gt.category AS 类别,
  COUNT(gtp.id) AS 阶段数量,
  '✓ 多阶段模板' AS 状态
FROM goal_templates gt
JOIN goal_template_phases gtp ON gt.id = gtp.goal_template_id
GROUP BY gt.id, gt.name, gt.category
HAVING COUNT(gtp.id) > 1
ORDER BY gt.created_at DESC;

-- 4. 查看特定模板的详细阶段信息（替换 YOUR_TEMPLATE_ID）
SELECT 
  gtp.id AS 阶段ID,
  gtp.name AS 阶段名称,
  gtp.order_index AS 排序,
  COUNT(gta.id) AS 行动数量
FROM goal_template_phases gtp
LEFT JOIN goal_template_actions gta ON gtp.id = gta.phase_id
WHERE gtp.goal_template_id = 'YOUR_TEMPLATE_ID'  -- 替换为实际模板ID
GROUP BY gtp.id, gtp.name, gtp.order_index
ORDER BY gtp.order_index;

