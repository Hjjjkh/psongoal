import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 诊断 API：检查 todos 表是否存在和可访问
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查表是否存在
    const { data, error } = await supabase
      .from('todos')
      .select('id, content, checked, expires_at, created_at')
      .limit(1)

    if (error) {
      // 检查是否是列不存在错误
      const isColumnError = error.code === '42703' || error.message?.includes('does not exist')
      const isTableError = error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('table')
      
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        tableExists: !isTableError,
        columnError: isColumnError,
        fixInstructions: isColumnError 
          ? '表存在但列结构不匹配。请运行迁移脚本：supabase/migration_fix_todos_schema.sql'
          : isTableError
          ? '表不存在。请运行迁移脚本：supabase/migration_add_todos.sql'
          : '请检查数据库连接和权限设置',
      }, { status: 500 })
    }

    // 测试插入权限
    const testExpiresAt = new Date()
    testExpiresAt.setDate(testExpiresAt.getDate() + 7)
    
    const { data: insertData, error: insertError } = await supabase
      .from('todos')
      .insert({
        user_id: user.id,
        content: 'TEST_TODO_DELETE_ME',
        checked: false,
        expires_at: testExpiresAt.toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      // 清理测试数据（如果创建了）
      if (insertData && typeof insertData === 'object' && 'id' in insertData) {
        const todoId = (insertData as { id: string }).id
        if (todoId) {
          await supabase.from('todos').delete().eq('id', todoId)
        }
      }
      
      return NextResponse.json({
        success: false,
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        tableExists: true,
        canRead: true,
        canInsert: false,
      }, { status: 500 })
    }

    // 清理测试数据
    if (insertData?.id) {
      await supabase.from('todos').delete().eq('id', insertData.id)
    }

    return NextResponse.json({
      success: true,
      tableExists: true,
      canRead: true,
      canInsert: true,
      canDelete: true,
      message: '数据库连接正常，todos 表可正常访问',
    })
  } catch (error) {
    console.error('Diagnostic error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      tableExists: false,
    }, { status: 500 })
  }
}

