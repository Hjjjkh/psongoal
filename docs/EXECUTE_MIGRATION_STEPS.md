# 执行数据库迁移步骤（避免警告）

## ⚠️ Supabase 警告说明

Supabase 会警告包含 `DROP` 语句的查询，因为 `DROP` 是破坏性操作。但在这个迁移中：
- 使用了 `IF EXISTS`，所以是安全的
- 只会删除已存在的策略/触发器，不会影响数据
- 可以安全执行

---

## ✅ 推荐方案：分步执行（避免警告）

### 步骤1：检查表是否已存在

```sql
-- 检查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'action_templates';
```

**如果返回结果**：表已存在，跳到步骤3  
**如果没有结果**：继续步骤2

---

### 步骤2：创建表和基础结构（无 DROP，安全）

```sql
-- 1. 确保触发器函数存在
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. 创建表
CREATE TABLE IF NOT EXISTS action_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('health', 'learning', 'project', 'custom')),
  title TEXT NOT NULL,
  definition TEXT NOT NULL,
  estimated_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_action_templates_user_id ON action_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_action_templates_category ON action_templates(category);

-- 4. 启用 RLS
ALTER TABLE action_templates ENABLE ROW LEVEL SECURITY;
```

---

### 步骤3：检查策略是否已存在

```sql
-- 检查策略是否存在
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'action_templates';
```

**如果返回 4 行**：策略已存在，跳到步骤5  
**如果没有结果或少于 4 行**：继续步骤4

---

### 步骤4：创建 RLS 策略

```sql
-- 创建 RLS 策略
-- 如果策略已存在会报错，可以忽略

CREATE POLICY "Users can view own templates" ON action_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON action_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON action_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON action_templates
  FOR DELETE USING (auth.uid() = user_id);
```

**如果报错 "policy already exists"**：
- 可以忽略（说明策略已存在）
- 或者执行步骤4.1删除后重新创建

---

### 步骤4.1（可选）：删除已存在的策略

**⚠️ 注意：这会触发 Supabase 警告，但可以安全执行**

```sql
-- 删除已存在的策略（仅在需要时执行）
DROP POLICY IF EXISTS "Users can view own templates" ON action_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON action_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON action_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON action_templates;
```

然后重新执行步骤4。

---

### 步骤5：检查触发器是否已存在

```sql
-- 检查触发器是否存在
SELECT tgname 
FROM pg_trigger 
WHERE tgname = 'update_action_templates_updated_at';
```

**如果返回结果**：触发器已存在，完成  
**如果没有结果**：继续步骤6

---

### 步骤6：创建触发器

```sql
-- 创建触发器
CREATE TRIGGER update_action_templates_updated_at BEFORE UPDATE ON action_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 🚀 快速方案：一次性执行（会触发警告，但安全）

如果你想一次性执行，可以使用 `migration_add_action_templates_complete.sql`：

1. **确认警告**：Supabase 会警告包含 DROP 语句
2. **点击确认**：这些 DROP 语句使用了 `IF EXISTS`，是安全的
3. **执行完成**：等待执行完成

---

## ✅ 验证迁移成功

执行以下 SQL 验证：

```sql
-- 1. 检查表是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'action_templates';
-- 应该返回：action_templates

-- 2. 检查 RLS 是否启用
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'action_templates';
-- 应该返回：action_templates | true

-- 3. 检查策略数量
SELECT COUNT(*) FROM pg_policies 
WHERE tablename = 'action_templates';
-- 应该返回：4

-- 4. 检查触发器
SELECT tgname FROM pg_trigger 
WHERE tgname = 'update_action_templates_updated_at';
-- 应该返回：update_action_templates_updated_at
```

---

## 📝 总结

**推荐方式**：
- **首次执行**：使用分步执行（步骤1-6），避免警告
- **重新执行**：使用完整版（`migration_add_action_templates_complete.sql`），确认警告后执行

**所有操作都是安全的**：
- `DROP IF EXISTS` 只删除已存在的对象
- 不会影响数据
- 不会影响其他表

