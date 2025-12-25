-- ============================================
-- 执行力增强：添加 completed_at 字段
-- 目的：从"打卡式完成"升级为"一次性推进式完成"
-- ============================================

-- 为 actions 表添加 completed_at 字段
ALTER TABLE actions
ADD COLUMN IF NOT EXISTS completed_at DATE NULL;

-- 添加注释说明字段用途
COMMENT ON COLUMN actions.completed_at IS 
'Action 完成日期。Action 一生只能完成一次，completed_at 非空即视为永久完成。推进逻辑的唯一真相源。';

-- 可选：为已完成但未设置 completed_at 的历史数据设置默认值
-- 注意：此操作需要根据实际业务逻辑决定是否执行
-- UPDATE actions 
-- SET completed_at = (
--   SELECT MAX(date) 
--   FROM daily_executions 
--   WHERE daily_executions.action_id = actions.id 
--     AND daily_executions.completed = true
-- )
-- WHERE completed_at IS NULL
--   AND EXISTS (
--     SELECT 1 
--     FROM daily_executions 
--     WHERE daily_executions.action_id = actions.id 
--       AND daily_executions.completed = true
--   );

