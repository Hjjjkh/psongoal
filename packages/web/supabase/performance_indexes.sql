-- 【性能优化】数据库索引建议
-- 这些索引可以显著提升查询性能，特别是在数据量较大的情况下

-- Goals 表索引
-- 用户目标查询（最常用）
CREATE INDEX IF NOT EXISTS idx_goals_user_id_created_at 
ON goals(user_id, created_at DESC);

-- 用户目标状态查询
CREATE INDEX IF NOT EXISTS idx_goals_user_id_status 
ON goals(user_id, status);

-- Phases 表索引
-- 目标阶段查询（按顺序）
CREATE INDEX IF NOT EXISTS idx_phases_goal_id_order 
ON phases(goal_id, order_index);

-- Actions 表索引
-- 阶段行动查询（按顺序）
CREATE INDEX IF NOT EXISTS idx_actions_phase_id_order 
ON actions(phase_id, order_index);

-- 已完成行动查询
CREATE INDEX IF NOT EXISTS idx_actions_completed_at 
ON actions(completed_at) 
WHERE completed_at IS NOT NULL;

-- Daily Executions 表索引
-- 用户执行记录查询（按日期）
CREATE INDEX IF NOT EXISTS idx_daily_executions_user_date 
ON daily_executions(user_id, date DESC);

-- 用户完成记录查询
CREATE INDEX IF NOT EXISTS idx_daily_executions_user_completed 
ON daily_executions(user_id, completed, date DESC)
WHERE completed = true;

-- System States 表索引（注意：表名是 system_states，复数）
-- 用户系统状态查询
CREATE INDEX IF NOT EXISTS idx_system_states_user_id 
ON system_states(user_id);

-- 当前目标查询
CREATE INDEX IF NOT EXISTS idx_system_states_current_goal 
ON system_states(user_id, current_goal_id)
WHERE current_goal_id IS NOT NULL;

-- 当前行动查询
CREATE INDEX IF NOT EXISTS idx_system_states_current_action 
ON system_states(user_id, current_action_id)
WHERE current_action_id IS NOT NULL;

-- 复合索引优化（用于常见查询模式）
-- 目标及其阶段和行动的一体化查询
-- 这些索引已经通过上面的单表索引覆盖

-- 注意：索引会占用存储空间并可能略微影响写入性能
-- 但对于读多写少的应用场景，这些索引是值得的

