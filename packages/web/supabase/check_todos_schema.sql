-- ============================================
-- 检查 todos 表结构（只读，不修改任何内容）
-- 运行此查询可以查看当前表结构，不会做任何修改
-- ============================================

-- 检查表是否存在
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'todos'
    ) THEN '表 todos 存在'
    ELSE '表 todos 不存在'
  END AS table_status;

-- 列出所有列
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'todos'
ORDER BY ordinal_position;

-- 检查索引
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'todos';

-- 检查 RLS 策略
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'todos';

-- 检查 RLS 是否启用
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'todos';

