-- ============================================
-- 检查 focus_sessions 表结构（只读，不修改任何内容）
-- 运行此查询可以查看当前表结构，不会做任何修改
-- ============================================

-- 检查表是否存在
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'focus_sessions'
    ) THEN '表 focus_sessions 存在'
    ELSE '表 focus_sessions 不存在'
  END AS table_status;

-- 列出所有列（如果表存在）
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'focus_sessions'
ORDER BY ordinal_position;

-- 检查索引
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'focus_sessions';

-- 检查 RLS 策略
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'focus_sessions';

-- 检查 RLS 是否启用
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'focus_sessions';

