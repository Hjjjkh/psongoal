import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 诊断删除模板的权限和状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      )
    }

    // 检查模板是否存在
    const { data: template, error: templateError } = await supabase
      .from('goal_templates')
      .select('id, user_id, is_system, name, category')
      .eq('id', id)
      .single()

    if (templateError || !template) {
      return NextResponse.json({
        exists: false,
        error: templateError?.message || 'Template not found',
        canDelete: false,
        reason: 'Template does not exist'
      })
    }

    // 检查权限
    const canDelete = template.user_id === user.id || template.is_system === true
    const reason = canDelete 
      ? 'User has permission to delete'
      : `User (${user.id}) does not own template (${template.user_id}) and it is not a system template`

    // 检查关联的行动数量
    const { count: actionsCount } = await supabase
      .from('goal_template_actions')
      .select('*', { count: 'exact', head: true })
      .eq('goal_template_id', id)

    return NextResponse.json({
      exists: true,
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
        is_system: template.is_system,
        user_id: template.user_id,
        current_user_id: user.id,
      },
      canDelete,
      reason,
      actionsCount: actionsCount || 0,
      recommendations: canDelete 
        ? ['Template can be deleted. If deletion fails, check RLS policies.']
        : [
            'User does not have permission to delete this template',
            template.is_system 
              ? 'Ensure RLS policy allows deleting system templates (run migration_allow_delete_system_templates.sql)'
              : 'Only the template owner can delete non-system templates'
          ]
    })
  } catch (error) {
    console.error('Error checking delete permission:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

