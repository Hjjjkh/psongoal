import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoalTemplate, updateGoalTemplate, deleteGoalTemplate } from '@/lib/goal-templates'

/**
 * 获取单个目标模板
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
    const template = await getGoalTemplate(user.id, id)

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error('Error fetching goal template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 更新目标模板
 */
export async function PUT(
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

    const body = await request.json()
    const { name, phase_name, phase_description, description, category, actions, phases } = body

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (category !== undefined) updates.category = category
    
    // 支持多阶段更新
    if (phases !== undefined) {
      updates.phases = phases
    } else if (phase_name !== undefined || phase_description !== undefined || actions !== undefined) {
      // 向后兼容：单阶段更新
      if (phase_name !== undefined) updates.phase_name = phase_name
      if (phase_description !== undefined) updates.phase_description = phase_description
      if (actions !== undefined) updates.actions = actions
    }

    const success = await updateGoalTemplate(user.id, id, updates)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update template or template not found' },
        { status: 404 }
      )
    }

    // 返回更新后的模板
    const template = await getGoalTemplate(user.id, id)
    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error('Error updating goal template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 删除目标模板（允许删除系统模板）
 */
export async function DELETE(
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
    
    console.log('DELETE request for template:', { id, type: typeof id })
    
    if (!id || typeof id !== 'string') {
      console.error('Invalid template ID:', id)
      return NextResponse.json(
        { error: 'Invalid template ID', received: id },
        { status: 400 }
      )
    }

    // 先检查模板是否存在及权限
    // 使用 or 查询，允许查看系统模板或用户自己的模板
    const { data: template, error: checkError } = await supabase
      .from('goal_templates')
      .select('id, user_id, is_system, name')
      .eq('id', id)
      .or(`user_id.eq.${user.id},is_system.eq.true`)
      .maybeSingle()

    console.log('Template check result:', {
      id,
      found: !!template,
      error: checkError,
      template: template ? { id: template.id, name: template.name, is_system: template.is_system, user_id: template.user_id } : null
    })

    if (checkError) {
      console.error('Error checking template:', checkError)
      // 检查是否是权限问题
      if (checkError.code === 'PGRST116' || checkError.message?.includes('No rows')) {
        return NextResponse.json(
          { error: 'Template not found', details: checkError.message },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { 
          error: 'Failed to check template',
          details: checkError.message || 'Unknown error',
          code: checkError.code
        },
        { status: 500 }
      )
    }

    if (!template) {
      console.error('Template not found:', id)
      return NextResponse.json(
        { error: 'Template not found', templateId: id },
        { status: 404 }
      )
    }

    // 权限预检查
    const canDelete = template.user_id === user.id || template.is_system === true
    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this template' },
        { status: 403 }
      )
    }

    // 执行删除
    const success = await deleteGoalTemplate(user.id, id)

    if (!success) {
      // 等待一小段时间，然后再次检查模板是否还存在
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const { data: stillExists, error: checkError } = await supabase
        .from('goal_templates')
        .select('id, name, is_system, user_id')
        .eq('id', id)
        .maybeSingle()

      if (!stillExists) {
        // 模板已经被删除（可能是级联删除或其他原因）
        console.log('Template was deleted (verified after deleteGoalTemplate returned false)')
        return NextResponse.json({ 
          success: true,
          message: 'Template deleted successfully'
        })
      }

      // 模板仍然存在，删除失败
      console.error('Template deletion failed, template still exists:', {
        templateId: id,
        template: stillExists,
        isSystem: template.is_system,
        templateUserId: template.user_id,
        currentUserId: user.id
      })

      // 提供更详细的错误信息
      if (template.is_system) {
        return NextResponse.json(
          { 
            error: 'Failed to delete system template',
            details: 'RLS policy may be blocking deletion. Please ensure migration_allow_delete_system_templates.sql has been executed.',
            template: {
              id: stillExists?.id,
              name: stillExists?.name,
              is_system: stillExists?.is_system
            }
          },
          { status: 403 }
        )
      } else {
        return NextResponse.json(
          { 
            error: 'Failed to delete template',
            details: 'Please check database permissions and RLS policies',
            template: {
              id: stillExists?.id,
              name: stillExists?.name,
              user_id: stillExists?.user_id
            }
          },
          { status: 500 }
        )
      }
    }

    // 删除成功，再次验证
    await new Promise(resolve => setTimeout(resolve, 100))
    const { data: verifyExists } = await supabase
      .from('goal_templates')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (verifyExists) {
      console.warn('Template still exists after successful deletion:', verifyExists)
    }

    return NextResponse.json({ 
      success: true,
      message: template.is_system 
        ? 'System template deleted. You can reinitialize it to get the latest version.'
        : 'Template deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting goal template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

