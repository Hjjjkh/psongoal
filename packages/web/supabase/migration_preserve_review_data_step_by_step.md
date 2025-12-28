# 分步执行迁移指南

如果担心一次性执行所有操作，可以分步执行并验证每一步。

## 执行前准备

1. **备份数据库**
   - 在 Supabase Dashboard 中：Database -> Backups -> Create Backup
   - 或者使用 pg_dump 导出数据

2. **检查当前状态**
   ```sql
   -- 检查 daily_executions 表结构
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'daily_executions'
   ORDER BY ordinal_position;
   
   -- 检查外键约束
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = 'daily_executions';
   
   -- 检查记录数量
   SELECT COUNT(*) as total_records FROM daily_executions;
   ```

## 分步执行

### 步骤 1: 添加快照字段（最安全）

```sql
BEGIN;

-- 添加列
ALTER TABLE daily_executions
ADD COLUMN IF NOT EXISTS action_title TEXT,
ADD COLUMN IF NOT EXISTS action_definition TEXT,
ADD COLUMN IF NOT EXISTS goal_name TEXT,
ADD COLUMN IF NOT EXISTS phase_name TEXT;

-- 验证
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'daily_executions' 
AND column_name IN ('action_title', 'action_definition', 'goal_name', 'phase_name');

COMMIT;
```

**验证通过后继续下一步**

### 步骤 2: 填充现有记录的快照字段

```sql
BEGIN;

-- 更新快照字段
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

-- 验证：检查填充情况
SELECT 
  COUNT(*) as total,
  COUNT(action_title) as has_title,
  COUNT(action_definition) as has_definition,
  COUNT(goal_name) as has_goal_name,
  COUNT(phase_name) as has_phase_name
FROM daily_executions
WHERE action_id IS NOT NULL;

COMMIT;
```

**验证通过后继续下一步**

### 步骤 3: 修改外键约束（需要谨慎）

```sql
BEGIN;

-- 3.1 删除旧约束
ALTER TABLE daily_executions
DROP CONSTRAINT IF EXISTS daily_executions_action_id_fkey;

-- 验证：确认约束已删除
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'daily_executions'
AND constraint_name = 'daily_executions_action_id_fkey';
-- 应该返回 0 行

-- 3.2 允许 action_id 为 NULL
ALTER TABLE daily_executions
ALTER COLUMN action_id DROP NOT NULL;

-- 验证：确认列可为空
SELECT is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_executions'
AND column_name = 'action_id';
-- 应该返回 'YES'

-- 3.3 创建新约束
ALTER TABLE daily_executions
ADD CONSTRAINT daily_executions_action_id_fkey
FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE SET NULL;

-- 验证：确认约束已创建
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'daily_executions'
AND constraint_name = 'daily_executions_action_id_fkey';
-- 应该返回 1 行

COMMIT;
```

**验证通过后继续下一步**

### 步骤 4: 创建触发器和函数

```sql
BEGIN;

-- 创建函数
CREATE OR REPLACE FUNCTION fill_execution_snapshot()
RETURNS TRIGGER AS $$
BEGIN
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

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_fill_execution_snapshot ON daily_executions;
CREATE TRIGGER trigger_fill_execution_snapshot
BEFORE INSERT OR UPDATE ON daily_executions
FOR EACH ROW
WHEN (NEW.action_id IS NOT NULL)
EXECUTE FUNCTION fill_execution_snapshot();

-- 验证：测试触发器（插入一条测试记录）
-- 注意：测试后记得删除测试记录

COMMIT;
```

## 回滚方案

如果任何步骤出现问题，可以执行：

```sql
-- 回滚当前事务
ROLLBACK;

-- 或者如果需要完全回滚所有更改：
BEGIN;

-- 删除新添加的列
ALTER TABLE daily_executions
DROP COLUMN IF EXISTS action_title,
DROP COLUMN IF EXISTS action_definition,
DROP COLUMN IF EXISTS goal_name,
DROP COLUMN IF EXISTS phase_name;

-- 恢复外键约束（如果已修改）
ALTER TABLE daily_executions
DROP CONSTRAINT IF EXISTS daily_executions_action_id_fkey;

ALTER TABLE daily_executions
ALTER COLUMN action_id SET NOT NULL;

ALTER TABLE daily_executions
ADD CONSTRAINT daily_executions_action_id_fkey
FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE;

-- 删除触发器
DROP TRIGGER IF EXISTS trigger_fill_execution_snapshot ON daily_executions;
DROP FUNCTION IF EXISTS fill_execution_snapshot();

COMMIT;
```

## 执行后验证

```sql
-- 1. 检查表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_executions'
ORDER BY ordinal_position;

-- 2. 检查约束
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'daily_executions';

-- 3. 检查触发器
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'daily_executions';

-- 4. 检查数据完整性
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN action_id IS NOT NULL THEN 1 END) as with_action_id,
  COUNT(CASE WHEN action_title IS NOT NULL THEN 1 END) as with_snapshot
FROM daily_executions;
```

