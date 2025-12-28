-- ============================================
-- 迁移：保护复盘数据，使其独立于 action 的存在
-- ============================================
-- 
-- 目标：即使删除 action，历史执行记录和统计数据仍然保留
-- 这样用户可以查看真实的坚持天数、趋势和完成情况
--
-- ⚠️ 重要提示：
-- 1. 执行前请备份数据库
-- 2. 建议先在测试环境执行
-- 3. 所有操作都在事务中，可以回滚
-- 4. 删除约束不会删除数据，只是修改约束关系
--
-- 安全说明：
-- - DROP CONSTRAINT: 删除外键约束（不会删除数据）
-- - ALTER COLUMN: 允许 action_id 为 NULL（为 SET NULL 做准备）
-- - ADD CONSTRAINT: 重新创建约束，行为从 CASCADE 改为 SET NULL
-- ============================================

BEGIN;

-- 1. 修改 daily_executions 表，添加 action 快照字段
-- 这样即使 action 被删除，我们仍然知道当时执行的是什么任务
-- ✅ 安全操作：只添加列，不影响现有数据
ALTER TABLE daily_executions
ADD COLUMN IF NOT EXISTS action_title TEXT,
ADD COLUMN IF NOT EXISTS action_definition TEXT,
ADD COLUMN IF NOT EXISTS goal_name TEXT,
ADD COLUMN IF NOT EXISTS phase_name TEXT;

-- 2. 更新现有的 daily_executions 记录，填充快照字段
-- 为所有现有的执行记录填充 action 和 goal 的快照信息
-- ✅ 安全操作：只更新数据，不删除任何记录
UPDATE daily_executions de
SET 
  action_title = COALESCE(de.action_title, a.title),
  action_definition = COALESCE(de.action_definition, a.definition),
  phase_name = COALESCE(de.phase_name, p.name),
  goal_name = COALESCE(de.goal_name, g.name)
FROM actions a
JOIN phases p ON a.phase_id = p.id
JOIN goals g ON p.goal_id = g.id
WHERE de.action_id = a.id
  AND (de.action_title IS NULL OR de.action_definition IS NULL OR de.phase_name IS NULL OR de.goal_name IS NULL);

-- 3. 修改外键约束，从 CASCADE 改为 SET NULL
-- ⚠️ 注意：删除约束不会删除数据，只是删除约束关系
-- 我们会立即重新创建约束，只是行为从 CASCADE 改为 SET NULL

-- 3.1 删除旧的外键约束
ALTER TABLE daily_executions
DROP CONSTRAINT IF EXISTS daily_executions_action_id_fkey;

-- 3.2 允许 action_id 为 NULL（SET NULL 需要列可为空）
ALTER TABLE daily_executions
ALTER COLUMN action_id DROP NOT NULL;

-- 3.3 创建新的外键约束，使用 SET NULL 而不是 CASCADE
ALTER TABLE daily_executions
ADD CONSTRAINT daily_executions_action_id_fkey
FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE SET NULL;

-- 4. 创建触发器，在插入 daily_executions 时自动填充快照字段
CREATE OR REPLACE FUNCTION fill_execution_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果快照字段为空，从关联的 action 中获取
  IF NEW.action_title IS NULL OR NEW.action_definition IS NULL OR NEW.phase_name IS NULL OR NEW.goal_name IS NULL THEN
    SELECT 
      a.title,
      a.definition,
      p.name,
      g.name
    INTO 
      NEW.action_title,
      NEW.action_definition,
      NEW.phase_name,
      NEW.goal_name
    FROM actions a
    JOIN phases p ON a.phase_id = p.id
    JOIN goals g ON p.goal_id = g.id
    WHERE a.id = NEW.action_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_fill_execution_snapshot ON daily_executions;
CREATE TRIGGER trigger_fill_execution_snapshot
BEFORE INSERT OR UPDATE ON daily_executions
FOR EACH ROW
WHEN (NEW.action_id IS NOT NULL)
EXECUTE FUNCTION fill_execution_snapshot();

-- 5. 添加注释
COMMENT ON COLUMN daily_executions.action_title IS '行动标题快照（用于复盘，即使 action 被删除也保留）';
COMMENT ON COLUMN daily_executions.action_definition IS '行动定义快照（用于复盘，即使 action 被删除也保留）';
COMMENT ON COLUMN daily_executions.goal_name IS '目标名称快照（用于复盘，即使 goal 被删除也保留）';
COMMENT ON COLUMN daily_executions.phase_name IS '阶段名称快照（用于复盘，即使 phase 被删除也保留）';

-- 6. 更新唯一约束，因为 action_id 现在可以为 NULL
-- 如果 action_id 为 NULL，使用快照信息来区分
-- 但为了简化，我们保持现有的唯一约束，只是允许 action_id 为 NULL
-- 注意：PostgreSQL 的 UNIQUE 约束允许 NULL 值，所以不需要修改

-- ============================================
-- 提交事务
-- ============================================
-- 如果执行过程中出现问题，可以执行 ROLLBACK; 回滚所有更改
COMMIT;

-- ============================================
-- 执行后验证（可选）
-- ============================================
-- 可以执行以下查询验证迁移是否成功：
-- 
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'daily_executions' 
-- AND column_name IN ('action_title', 'action_definition', 'goal_name', 'phase_name');
--
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name = 'daily_executions'
-- AND constraint_name = 'daily_executions_action_id_fkey';
--
-- SELECT COUNT(*) FROM daily_executions WHERE action_title IS NOT NULL;

