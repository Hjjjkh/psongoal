-- ============================================
-- 安全迁移：保护复盘数据，使其独立于 action 的存在
-- ============================================
-- 
-- 目标：即使删除 action，历史执行记录和统计数据仍然保留
-- 这样用户可以查看真实的坚持天数、趋势和完成情况
--
-- 安全说明：
-- 1. 所有操作都在事务中执行，可以回滚
-- 2. 使用 IF EXISTS/IF NOT EXISTS 避免重复执行错误
-- 3. 删除约束后立即重新创建，不会丢失数据
-- 4. 添加数据验证步骤
--
-- 执行建议：
-- 1. 先在测试环境执行
-- 2. 执行前备份数据库（Supabase Dashboard -> Database -> Backups）
-- 3. 可以分步执行，每步验证后再继续
-- ============================================

BEGIN;

-- ============================================
-- 步骤 1: 添加快照字段（安全，只添加列）
-- ============================================
-- 这些操作是安全的，只是添加新列，不会影响现有数据
ALTER TABLE daily_executions
ADD COLUMN IF NOT EXISTS action_title TEXT,
ADD COLUMN IF NOT EXISTS action_definition TEXT,
ADD COLUMN IF NOT EXISTS goal_name TEXT,
ADD COLUMN IF NOT EXISTS phase_name TEXT;

-- 验证：检查列是否添加成功
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_executions' 
    AND column_name = 'action_title'
  ) THEN
    RAISE EXCEPTION '列 action_title 添加失败';
  END IF;
END $$;

-- ============================================
-- 步骤 2: 更新现有记录的快照字段（安全，只更新数据）
-- ============================================
-- 先填充快照字段，确保数据完整后再修改约束
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

-- 验证：检查是否有记录未填充（应该为 0 或很少）
DO $$
DECLARE
  unfilled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unfilled_count
  FROM daily_executions de
  JOIN actions a ON de.action_id = a.id
  WHERE de.action_title IS NULL OR de.action_definition IS NULL;
  
  IF unfilled_count > 0 THEN
    RAISE WARNING '有 % 条记录的快照字段未填充（可能 action 已被删除）', unfilled_count;
  END IF;
END $$;

-- ============================================
-- 步骤 3: 修改外键约束（需要删除后重建）
-- ============================================
-- 注意：删除约束不会删除数据，只是删除约束关系
-- 我们会立即重新创建约束，只是行为从 CASCADE 改为 SET NULL

-- 3.1 删除旧的外键约束
-- 使用 IF EXISTS 确保即使约束不存在也不会报错
ALTER TABLE daily_executions
DROP CONSTRAINT IF EXISTS daily_executions_action_id_fkey;

-- 3.2 修改 action_id 列，允许 NULL（因为 SET NULL 需要列可为空）
-- 注意：如果列已经是可空的，这个操作不会改变任何东西
ALTER TABLE daily_executions
ALTER COLUMN action_id DROP NOT NULL;

-- 3.3 创建新的外键约束，使用 SET NULL 而不是 CASCADE
ALTER TABLE daily_executions
ADD CONSTRAINT daily_executions_action_id_fkey
FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE SET NULL;

-- 验证：检查约束是否创建成功
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'daily_executions_action_id_fkey'
    AND table_name = 'daily_executions'
  ) THEN
    RAISE EXCEPTION '外键约束创建失败';
  END IF;
END $$;

-- ============================================
-- 步骤 4: 创建触发器函数（安全，创建或替换）
-- ============================================
CREATE OR REPLACE FUNCTION fill_execution_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果快照字段为空且 action_id 不为空，从关联的 action 中获取
  IF NEW.action_id IS NOT NULL THEN
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 步骤 5: 创建触发器（安全，删除后重建）
-- ============================================
DROP TRIGGER IF EXISTS trigger_fill_execution_snapshot ON daily_executions;
CREATE TRIGGER trigger_fill_execution_snapshot
BEFORE INSERT OR UPDATE ON daily_executions
FOR EACH ROW
WHEN (NEW.action_id IS NOT NULL)
EXECUTE FUNCTION fill_execution_snapshot();

-- ============================================
-- 步骤 6: 添加列注释（安全，只添加元数据）
-- ============================================
COMMENT ON COLUMN daily_executions.action_title IS '行动标题快照（用于复盘，即使 action 被删除也保留）';
COMMENT ON COLUMN daily_executions.action_definition IS '行动定义快照（用于复盘，即使 action 被删除也保留）';
COMMENT ON COLUMN daily_executions.goal_name IS '目标名称快照（用于复盘，即使 goal 被删除也保留）';
COMMENT ON COLUMN daily_executions.phase_name IS '阶段名称快照（用于复盘，即使 phase 被删除也保留）';

-- ============================================
-- 最终验证
-- ============================================
DO $$
DECLARE
  total_records INTEGER;
  filled_records INTEGER;
BEGIN
  -- 统计总记录数
  SELECT COUNT(*) INTO total_records FROM daily_executions;
  
  -- 统计已填充快照的记录数（action_id 不为空时）
  SELECT COUNT(*) INTO filled_records
  FROM daily_executions
  WHERE action_id IS NOT NULL
    AND action_title IS NOT NULL
    AND action_definition IS NOT NULL;
  
  RAISE NOTICE '迁移完成！';
  RAISE NOTICE '总记录数: %', total_records;
  RAISE NOTICE '已填充快照的记录数: %', filled_records;
  
  IF total_records > 0 AND filled_records < total_records * 0.9 THEN
    RAISE WARNING '有部分记录的快照字段未填充，请检查';
  END IF;
END $$;

-- 提交事务
COMMIT;

-- ============================================
-- 回滚说明
-- ============================================
-- 如果执行过程中出现问题，可以执行 ROLLBACK; 回滚所有更改
-- 或者注释掉 COMMIT; 并执行 ROLLBACK;

