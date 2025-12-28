-- 验证性能优化索引是否创建成功
-- 执行此脚本检查所有索引是否已创建

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 统计索引数量
SELECT 
    COUNT(*) as total_indexes,
    COUNT(DISTINCT tablename) as tables_with_indexes
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- 检查关键索引是否存在
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_daily_executions_user_date') 
        THEN '✓ idx_daily_executions_user_date'
        ELSE '✗ idx_daily_executions_user_date'
    END as daily_executions_user_date,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_actions_phase_order') 
        THEN '✓ idx_actions_phase_order'
        ELSE '✗ idx_actions_phase_order'
    END as actions_phase_order,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_phases_goal_order') 
        THEN '✓ idx_phases_goal_order'
        ELSE '✗ idx_phases_goal_order'
    END as phases_goal_order,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_goals_user_created') 
        THEN '✓ idx_goals_user_created'
        ELSE '✗ idx_goals_user_created'
    END as goals_user_created,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_goal_template_actions_phase') 
        THEN '✓ idx_goal_template_actions_phase'
        ELSE '✗ idx_goal_template_actions_phase'
    END as goal_template_actions_phase;

