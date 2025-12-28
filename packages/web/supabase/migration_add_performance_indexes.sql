-- 性能优化：添加数据库索引
-- 创建日期: 2024-12-20
-- 说明: 为常用查询字段添加索引，加速数据库查询

-- 1. daily_executions 表索引
-- 用于查询用户的执行记录（按日期、用户ID、完成状态）
CREATE INDEX IF NOT EXISTS idx_daily_executions_user_date 
ON daily_executions(user_id, date DESC);

-- 用于查询特定日期的完成记录
CREATE INDEX IF NOT EXISTS idx_daily_executions_user_date_completed 
ON daily_executions(user_id, date, completed) 
WHERE completed = true;

-- 用于查询特定 action 的执行记录
CREATE INDEX IF NOT EXISTS idx_daily_executions_action_date 
ON daily_executions(action_id, date DESC) 
WHERE action_id IS NOT NULL;

-- 2. actions 表索引
-- 用于查询阶段下的行动（按顺序）
CREATE INDEX IF NOT EXISTS idx_actions_phase_order 
ON actions(phase_id, order_index);

-- 用于查询已完成的行动
CREATE INDEX IF NOT EXISTS idx_actions_completed_at 
ON actions(completed_at) 
WHERE completed_at IS NOT NULL;

-- 3. phases 表索引
-- 用于查询目标下的阶段（按顺序）
CREATE INDEX IF NOT EXISTS idx_phases_goal_order 
ON phases(goal_id, order_index);

-- 4. goals 表索引
-- 用于查询用户的目标（按创建时间）
CREATE INDEX IF NOT EXISTS idx_goals_user_created 
ON goals(user_id, created_at DESC);

-- 用于查询用户的活动目标
CREATE INDEX IF NOT EXISTS idx_goals_user_status 
ON goals(user_id, status) 
WHERE status != 'completed';

-- 5. system_states 表索引
-- 用于快速查询用户的系统状态
CREATE INDEX IF NOT EXISTS idx_system_states_user 
ON system_states(user_id);

-- 6. todos 表索引
-- 用于查询用户的待办事项
CREATE INDEX IF NOT EXISTS idx_todos_user_created 
ON todos(user_id, created_at DESC);

-- 用于查询过期的待办事项（清理用）
CREATE INDEX IF NOT EXISTS idx_todos_expires_at 
ON todos(expires_at) 
WHERE expires_at IS NOT NULL;

-- 7. focus_sessions 表索引
-- 用于查询用户的专注会话
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_created 
ON focus_sessions(user_id, created_at DESC);

-- 8. action_templates 表索引
-- 用于查询用户的行动模板
CREATE INDEX IF NOT EXISTS idx_action_templates_user 
ON action_templates(user_id, created_at DESC);

-- 9. goal_templates 表索引
-- 用于查询系统模板和用户模板
CREATE INDEX IF NOT EXISTS idx_goal_templates_user_system 
ON goal_templates(user_id, is_system, created_at DESC);

-- 10. goal_template_phases 表索引
-- 用于查询目标模板的阶段
CREATE INDEX IF NOT EXISTS idx_goal_template_phases_template 
ON goal_template_phases(goal_template_id, order_index);

-- 11. goal_template_actions 表索引
-- 用于查询阶段模板的行动
-- 注意：字段名是 phase_id，不是 goal_template_phase_id
CREATE INDEX IF NOT EXISTS idx_goal_template_actions_phase 
ON goal_template_actions(phase_id, order_index) 
WHERE phase_id IS NOT NULL;

-- 验证索引创建
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
    
    RAISE NOTICE '已创建 % 个性能优化索引', index_count;
END $$;

