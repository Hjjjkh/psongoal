# 复盘数据独立性设计

## 设计目标

确保复盘数据（趋势、完成情况、连续天数等）独立于 action/goal/phase 的存在，即使删除任务，历史统计数据仍然保留，真实反映用户的坚持情况。

## 核心设计

### 1. 快照机制

在 `daily_executions` 表中添加快照字段：
- `action_title`: 行动标题快照
- `action_definition`: 行动定义快照
- `goal_name`: 目标名称快照
- `phase_name`: 阶段名称快照

### 2. 外键约束修改

将 `daily_executions.action_id` 的外键约束从 `ON DELETE CASCADE` 改为 `ON DELETE SET NULL`：
- 删除 action 时，`daily_executions` 记录不会被删除
- `action_id` 变为 NULL，但快照字段保留完整信息
- 历史数据完整保留，用于复盘统计

### 3. 自动填充触发器

创建数据库触发器，在插入 `daily_executions` 时自动填充快照字段：
- 如果快照字段为空，从关联的 action 中获取
- 确保新记录始终有完整的快照信息

## 数据流程

### 创建执行记录时
1. 完成 action 时，调用 `completeActionAndAdvance`
2. 查询 action 及其关联的 phase 和 goal 信息
3. 填充快照字段到 `executionData`
4. 插入 `daily_executions` 记录（包含快照字段）

### 删除 action 时
1. 删除 action（`ON DELETE SET NULL`）
2. `daily_executions.action_id` 变为 NULL
3. 快照字段保留，历史数据完整
4. 复盘查询使用快照字段显示历史信息

### 复盘查询时
1. 直接查询 `daily_executions`，不依赖 action 的存在
2. 使用快照字段构建显示信息
3. 即使 action 已删除，也能显示完整的历史记录

## 优势

1. **数据真实性**：历史统计数据真实反映用户的坚持情况，不受删除操作影响
2. **数据完整性**：即使删除任务，也能查看完整的执行历史
3. **数据独立性**：复盘数据不依赖其他表的存在，独立存储
4. **向后兼容**：现有数据通过迁移脚本自动填充快照字段

## 迁移步骤

1. 执行 `migration_preserve_review_data.sql`
2. 迁移脚本会：
   - 添加快照字段
   - 修改外键约束
   - 更新现有记录的快照字段
   - 创建自动填充触发器

## 注意事项

1. 快照字段在创建记录时填充，删除 action 后不会更新
2. 如果 action 在创建记录前被删除，快照字段可能为空（但这种情况很少见）
3. 触发器确保新记录始终有完整的快照信息

