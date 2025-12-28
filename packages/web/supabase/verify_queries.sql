-- ============================================
-- 多阶段模板验证查询（逐个执行查看结果）
-- 在 Supabase SQL Editor 中逐个执行以下查询
-- ============================================

-- ============================================
-- 查询 1: 检查表结构
-- ============================================
SELECT 
  'goal_template_phases 表' AS 检查项,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_template_phases') 
    THEN '✓ 存在' 
    ELSE '✗ 不存在' 
  END AS 状态;

SELECT 
  'goal_template_actions.phase_id 字段' AS 检查项,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_template_actions' AND column_name = 'phase_id') 
    THEN '✓ 存在' 
    ELSE '✗ 不存在' 
  END AS 状态;

-- ============================================
-- 查询 2: 检查索引
-- ============================================
SELECT 
  indexname AS 索引名称,
  CASE 
    WHEN indexname IS NOT NULL THEN '✓ 存在'
    ELSE '✗ 不存在'
  END AS 状态
FROM pg_indexes
WHERE indexname IN (
  'idx_goal_template_phases_template_id',
  'idx_goal_template_phases_order',
  'idx_goal_template_actions_phase_id'
)
ORDER BY indexname;

-- ============================================
-- 查询 3: 检查 RLS 策略
-- ============================================
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE 
    WHEN cmd = 'SELECT' THEN '查询'
    WHEN cmd = 'INSERT' THEN '插入'
    WHEN cmd = 'UPDATE' THEN '更新'
    WHEN cmd = 'DELETE' THEN '删除'
    ELSE cmd
  END AS 操作说明
FROM pg_policies
WHERE tablename = 'goal_template_phases'
ORDER BY policyname;

-- 策略数量统计
SELECT 
  COUNT(*) AS 策略总数,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✓ 策略数量充足'
    ELSE '✗ 策略数量不足（期望至少 5 个）'
  END AS 状态
FROM pg_policies
WHERE tablename = 'goal_template_phases';

-- ============================================
-- 查询 4: 数据统计
-- ============================================
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
WHERE phase_id IS NOT NULL
UNION ALL
SELECT 
  '未关联阶段的行动数' AS 统计项,
  COUNT(*) AS 数量
FROM goal_template_actions
WHERE phase_id IS NULL;

-- 数据关联情况
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM goal_template_phases) >= (SELECT COUNT(*) FROM goal_templates)
    THEN '✓ 每个模板都有阶段数据'
    ELSE '✗ 部分模板没有阶段数据'
  END AS 模板阶段关联,
  CASE 
    WHEN (SELECT COUNT(*) FROM goal_template_actions WHERE phase_id IS NULL) = 0
    THEN '✓ 所有行动都已关联到阶段'
    ELSE '✗ 有行动未关联到阶段'
  END AS 行动阶段关联;

-- ============================================
-- 查询 5: 查看所有模板及其阶段
-- ============================================
SELECT 
  gt.id AS 模板ID,
  gt.name AS 模板名称,
  gt.category AS 类别,
  COUNT(DISTINCT gtp.id) AS 阶段数量,
  COUNT(DISTINCT gta.id) AS 行动数量
FROM goal_templates gt
LEFT JOIN goal_template_phases gtp ON gt.id = gtp.goal_template_id
LEFT JOIN goal_template_actions gta ON gtp.id = gta.phase_id
GROUP BY gt.id, gt.name, gt.category
ORDER BY gt.created_at DESC;

-- ============================================
-- 查询 6: 查看特定模板的详细阶段信息
-- ============================================
-- 替换 'YOUR_TEMPLATE_ID' 为实际的模板 ID
SELECT 
  gtp.id AS 阶段ID,
  gtp.name AS 阶段名称,
  gtp.description AS 阶段描述,
  gtp.order_index AS 排序,
  COUNT(gta.id) AS 行动数量
FROM goal_template_phases gtp
LEFT JOIN goal_template_actions gta ON gtp.id = gta.phase_id
WHERE gtp.goal_template_id = 'YOUR_TEMPLATE_ID'  -- 替换为实际模板ID
GROUP BY gtp.id, gtp.name, gtp.description, gtp.order_index
ORDER BY gtp.order_index;

-- 或者查看第一个模板的详细信息
SELECT 
  gt.name AS 模板名称,
  gtp.order_index AS 阶段排序,
  gtp.name AS 阶段名称,
  COUNT(gta.id) AS 行动数量
FROM goal_template_phases gtp
JOIN goal_templates gt ON gt.id = gtp.goal_template_id
LEFT JOIN goal_template_actions gta ON gtp.id = gta.phase_id
WHERE gt.id = (SELECT id FROM goal_templates ORDER BY created_at DESC LIMIT 1)
GROUP BY gt.name, gtp.order_index, gtp.name
ORDER BY gtp.order_index;

-- ============================================
-- 查询 7: 数据完整性检查
-- ============================================
-- 检查孤立的阶段（关联的模板不存在）
SELECT 
  COUNT(*) AS 孤立阶段数量,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ 没有孤立的阶段'
    ELSE '✗ 发现孤立的阶段'
  END AS 状态
FROM goal_template_phases gtp
WHERE NOT EXISTS (
  SELECT 1 FROM goal_templates gt
  WHERE gt.id = gtp.goal_template_id
);

-- 检查孤立的行动（关联的阶段不存在）
SELECT 
  COUNT(*) AS 孤立行动数量,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ 没有孤立的行动'
    ELSE '✗ 发现孤立的行动'
  END AS 状态
FROM goal_template_actions gta
WHERE gta.phase_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM goal_template_phases gtp
    WHERE gtp.id = gta.phase_id
  );

-- ============================================
-- 查询 8: 查看所有阶段的详细信息
-- ============================================
SELECT 
  gt.name AS 模板名称,
  gt.category AS 类别,
  gtp.order_index AS 阶段排序,
  gtp.name AS 阶段名称,
  gtp.description AS 阶段描述,
  COUNT(gta.id) AS 行动数量
FROM goal_template_phases gtp
JOIN goal_templates gt ON gt.id = gtp.goal_template_id
LEFT JOIN goal_template_actions gta ON gtp.id = gta.phase_id
GROUP BY gt.name, gt.category, gtp.order_index, gtp.name, gtp.description
ORDER BY gt.name, gtp.order_index;

-- ============================================
-- 查询 9: 快速验证总结
-- ============================================
SELECT 
  '表结构' AS 检查项,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_template_phases')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_template_actions' AND column_name = 'phase_id')
    THEN '✓ 通过'
    ELSE '✗ 失败'
  END AS 状态
UNION ALL
SELECT 
  '索引' AS 检查项,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_indexes WHERE indexname IN ('idx_goal_template_phases_template_id', 'idx_goal_template_phases_order', 'idx_goal_template_actions_phase_id')) = 3
    THEN '✓ 通过'
    ELSE '✗ 失败'
  END AS 状态
UNION ALL
SELECT 
  'RLS策略' AS 检查项,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'goal_template_phases') >= 5
    THEN '✓ 通过'
    ELSE '✗ 失败'
  END AS 状态
UNION ALL
SELECT 
  '数据完整性' AS 检查项,
  CASE 
    WHEN (SELECT COUNT(*) FROM goal_template_phases gtp WHERE NOT EXISTS (SELECT 1 FROM goal_templates gt WHERE gt.id = gtp.goal_template_id)) = 0
      AND (SELECT COUNT(*) FROM goal_template_actions gta WHERE gta.phase_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM goal_template_phases gtp WHERE gtp.id = gta.phase_id)) = 0
    THEN '✓ 通过'
    ELSE '✗ 失败'
  END AS 状态;

