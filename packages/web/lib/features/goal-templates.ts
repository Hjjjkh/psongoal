/**
 * 目标模板管理
 * 支持个人模板和系统模板
 */

import { createClient } from '../supabase/server'

export interface GoalTemplateAction {
  id?: string
  action_template_id?: string | null
  phase_id?: string | null
  title_template: string
  definition: string
  estimated_time: number | null
  order_index: number
}

export interface GoalTemplatePhase {
  id: string
  goal_template_id: string
  name: string
  description: string | null
  order_index: number
  created_at: string
  updated_at: string
  actions?: GoalTemplateAction[]
}

export interface GoalTemplate {
  id: string
  user_id: string
  category: 'health' | 'learning' | 'project' | 'custom'
  name: string
  phase_name: string // 保留用于向后兼容
  phase_description: string | null // 保留用于向后兼容
  description: string | null
  is_system: boolean
  created_at: string
  updated_at: string
  actions?: GoalTemplateAction[] // 保留用于向后兼容
  phases?: GoalTemplatePhase[] // 多阶段支持
}

/**
 * 获取用户的目标模板（包括系统模板）
 */
export async function getUserGoalTemplates(
  userId: string,
  category?: 'health' | 'learning' | 'project' | 'custom'
): Promise<GoalTemplate[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('goal_templates')
    .select('*')
    .or(`user_id.eq.${userId},is_system.eq.true`)
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching goal templates:', error)
    return []
  }

  // 获取每个模板的阶段和行动
  const templatesWithPhases = await Promise.all(
    (data || []).map(async (template) => {
      // 获取阶段
      const { data: phases } = await supabase
        .from('goal_template_phases')
        .select('*')
        .eq('goal_template_id', template.id)
        .order('order_index', { ascending: true })

      // 如果没有阶段，尝试从旧字段获取（向后兼容）
      if (!phases || phases.length === 0) {
        const { data: actions } = await supabase
          .from('goal_template_actions')
          .select('*')
          .eq('goal_template_id', template.id)
          .order('order_index', { ascending: true })

        return {
          ...template,
          actions: actions || [],
          phases: template.phase_name ? [{
            id: '',
            goal_template_id: template.id,
            name: template.phase_name,
            description: template.phase_description,
            order_index: 0,
            created_at: template.created_at,
            updated_at: template.updated_at,
            actions: actions || [],
          }] : [],
        }
      }

      // 获取每个阶段的行动
      const phasesWithActions = await Promise.all(
        (phases || []).map(async (phase) => {
          const { data: actions } = await supabase
            .from('goal_template_actions')
            .select('*')
            .eq('phase_id', phase.id)
            .order('order_index', { ascending: true })

          return {
            ...phase,
            actions: actions || [],
          }
        })
      )

      return {
        ...template,
        phases: phasesWithActions,
        // 向后兼容：第一个阶段作为默认阶段
        phase_name: phasesWithActions[0]?.name || template.phase_name,
        phase_description: phasesWithActions[0]?.description || template.phase_description,
        actions: phasesWithActions[0]?.actions || [],
      }
    })
  )

  return templatesWithPhases
}

/**
 * 获取单个目标模板（包括行动）
 */
export async function getGoalTemplate(
  userId: string,
  templateId: string
): Promise<GoalTemplate | null> {
  const supabase = await createClient()

  const { data: template, error } = await supabase
    .from('goal_templates')
    .select('*')
    .eq('id', templateId)
    .or(`user_id.eq.${userId},is_system.eq.true`)
    .single()

  if (error || !template) {
    console.error('Error fetching goal template:', error)
    return null
  }

  // 获取阶段
  const { data: phases } = await supabase
    .from('goal_template_phases')
    .select('*')
    .eq('goal_template_id', template.id)
    .order('order_index', { ascending: true })

  // 如果没有阶段，尝试从旧字段获取（向后兼容）
  if (!phases || phases.length === 0) {
    const { data: actions } = await supabase
      .from('goal_template_actions')
      .select('*')
      .eq('goal_template_id', template.id)
      .order('order_index', { ascending: true })

    return {
      ...template,
      actions: actions || [],
      phases: template.phase_name ? [{
        id: '',
        goal_template_id: template.id,
        name: template.phase_name,
        description: template.phase_description,
        order_index: 0,
        created_at: template.created_at,
        updated_at: template.updated_at,
        actions: actions || [],
      }] : [],
    }
  }

  // 获取每个阶段的行动
  const phasesWithActions = await Promise.all(
    (phases || []).map(async (phase) => {
      const { data: actions } = await supabase
        .from('goal_template_actions')
        .select('*')
        .eq('phase_id', phase.id)
        .order('order_index', { ascending: true })

      return {
        ...phase,
        actions: actions || [],
      }
    })
  )

  return {
    ...template,
    phases: phasesWithActions,
    // 向后兼容：第一个阶段作为默认阶段
    phase_name: phasesWithActions[0]?.name || template.phase_name,
    phase_description: phasesWithActions[0]?.description || template.phase_description,
    actions: phasesWithActions[0]?.actions || [],
  }
}

/**
 * 创建目标模板
 */
export async function createGoalTemplate(
  userId: string,
  template: {
    category: 'health' | 'learning' | 'project' | 'custom'
    name: string
    phase_name?: string // 向后兼容
    phase_description?: string | null // 向后兼容
    description?: string | null
    actions?: GoalTemplateAction[] // 向后兼容：单阶段行动
    phases?: Array<{
      name: string
      description?: string | null
      actions?: GoalTemplateAction[]
    }> // 多阶段支持
  }
): Promise<GoalTemplate | null> {
  const supabase = await createClient()

  // 确定使用多阶段还是单阶段（向后兼容）
  const phases = template.phases && template.phases.length > 0
    ? template.phases
    : template.phase_name
      ? [{
          name: template.phase_name,
          description: template.phase_description || null,
          actions: template.actions || [],
        }]
      : []

  if (phases.length === 0) {
    console.error('Error: Template must have at least one phase')
    return null
  }

  // 创建模板（使用第一个阶段的信息作为向后兼容字段）
  const { data: createdTemplate, error: templateError } = await supabase
    .from('goal_templates')
    .insert({
      user_id: userId,
      category: template.category,
      name: template.name,
      phase_name: phases[0].name, // 向后兼容
      phase_description: phases[0].description || null, // 向后兼容
      description: template.description || null,
      is_system: false,
    })
    .select()
    .single()

  if (templateError || !createdTemplate) {
    console.error('Error creating goal template:', templateError)
    return null
  }

  // 创建阶段和行动
  for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
    const phase = phases[phaseIndex]
    
    // 创建阶段
    const { data: createdPhase, error: phaseError } = await supabase
      .from('goal_template_phases')
      .insert({
        goal_template_id: createdTemplate.id,
        name: phase.name,
        description: phase.description || null,
        order_index: phaseIndex,
      })
      .select()
      .single()

    if (phaseError || !createdPhase) {
      console.error('Error creating goal template phase:', phaseError)
      // 删除已创建的模板
      await supabase.from('goal_templates').delete().eq('id', createdTemplate.id)
      return null
    }

    // 创建行动关联
    if (phase.actions && phase.actions.length > 0) {
      const actionsToInsert = phase.actions.map((action, index) => ({
        goal_template_id: createdTemplate.id,
        phase_id: createdPhase.id,
        action_template_id: action.action_template_id || null,
        title_template: action.title_template,
        definition: action.definition,
        estimated_time: action.estimated_time,
        order_index: action.order_index ?? index,
      }))

      const { error: actionsError } = await supabase
        .from('goal_template_actions')
        .insert(actionsToInsert)

      if (actionsError) {
        console.error('Error creating goal template actions:', actionsError)
        // 删除已创建的模板和阶段
        await supabase.from('goal_template_phases').delete().eq('goal_template_id', createdTemplate.id)
        await supabase.from('goal_templates').delete().eq('id', createdTemplate.id)
        return null
      }
    }
  }

  // 返回完整的模板（包括阶段和行动）
  return getGoalTemplate(userId, createdTemplate.id)
}

/**
 * 更新目标模板
 */
export async function updateGoalTemplate(
  userId: string,
  templateId: string,
  updates: {
    name?: string
    phase_name?: string // 向后兼容
    phase_description?: string | null // 向后兼容
    description?: string | null
    category?: 'health' | 'learning' | 'project' | 'custom'
    actions?: GoalTemplateAction[] // 向后兼容：单阶段行动
    phases?: Array<{
      id?: string // 如果提供，则更新；否则创建新阶段
      name: string
      description?: string | null
      actions?: GoalTemplateAction[]
    }> // 多阶段支持
  }
): Promise<boolean> {
  const supabase = await createClient()

  // 检查模板是否属于用户
  const { data: existingTemplate } = await supabase
    .from('goal_templates')
    .select('user_id, is_system')
    .eq('id', templateId)
    .single()

  if (!existingTemplate || existingTemplate.is_system || existingTemplate.user_id !== userId) {
    return false
  }

  // 更新模板基本信息
  const templateUpdates: any = {}
  if (updates.name !== undefined) templateUpdates.name = updates.name
  if (updates.description !== undefined) templateUpdates.description = updates.description
  if (updates.category !== undefined) templateUpdates.category = updates.category
  templateUpdates.updated_at = new Date().toISOString()

  // 如果提供了多阶段更新
  if (updates.phases !== undefined) {
    // 更新第一个阶段的信息到向后兼容字段
    if (updates.phases.length > 0) {
      templateUpdates.phase_name = updates.phases[0].name
      templateUpdates.phase_description = updates.phases[0].description || null
    }

    // 获取现有阶段
    const { data: existingPhases } = await supabase
      .from('goal_template_phases')
      .select('id')
      .eq('goal_template_id', templateId)
      .order('order_index', { ascending: true })

    const existingPhaseIds = (existingPhases || []).map(p => p.id)
    const updatedPhaseIds: string[] = []

    // 更新或创建阶段
    for (let phaseIndex = 0; phaseIndex < updates.phases.length; phaseIndex++) {
      const phase = updates.phases[phaseIndex]
      
      if (phase.id && existingPhaseIds.includes(phase.id)) {
        // 更新现有阶段
        const { error: phaseError } = await supabase
          .from('goal_template_phases')
          .update({
            name: phase.name,
            description: phase.description || null,
            order_index: phaseIndex,
            updated_at: new Date().toISOString(),
          })
          .eq('id', phase.id)
          .eq('goal_template_id', templateId)

        if (phaseError) {
          console.error('Error updating phase:', phaseError)
          return false
        }

        updatedPhaseIds.push(phase.id)

        // 更新阶段的行动
        if (phase.actions !== undefined) {
          // 删除旧的行动
          await supabase
            .from('goal_template_actions')
            .delete()
            .eq('phase_id', phase.id)

          // 插入新的行动
          if (phase.actions.length > 0) {
            const actionsToInsert = phase.actions.map((action, index) => ({
              goal_template_id: templateId,
              phase_id: phase.id,
              action_template_id: action.action_template_id || null,
              title_template: action.title_template,
              definition: action.definition,
              estimated_time: action.estimated_time,
              order_index: action.order_index ?? index,
            }))

            const { error: actionsError } = await supabase
              .from('goal_template_actions')
              .insert(actionsToInsert)

            if (actionsError) {
              console.error('Error updating phase actions:', actionsError)
              return false
            }
          }
        }
      } else {
        // 创建新阶段
        const { data: newPhase, error: phaseError } = await supabase
          .from('goal_template_phases')
          .insert({
            goal_template_id: templateId,
            name: phase.name,
            description: phase.description || null,
            order_index: phaseIndex,
          })
          .select()
          .single()

        if (phaseError || !newPhase) {
          console.error('Error creating phase:', phaseError)
          return false
        }

        updatedPhaseIds.push(newPhase.id)

        // 创建阶段的行动
        if (phase.actions && phase.actions.length > 0) {
          const actionsToInsert = phase.actions.map((action, index) => ({
            goal_template_id: templateId,
            phase_id: newPhase.id,
            action_template_id: action.action_template_id || null,
            title_template: action.title_template,
            definition: action.definition,
            estimated_time: action.estimated_time,
            order_index: action.order_index ?? index,
          }))

          const { error: actionsError } = await supabase
            .from('goal_template_actions')
            .insert(actionsToInsert)

          if (actionsError) {
            console.error('Error creating phase actions:', actionsError)
            return false
          }
        }
      }
    }

    // 删除未更新的阶段
    const phasesToDelete = existingPhaseIds.filter(id => !updatedPhaseIds.includes(id))
    if (phasesToDelete.length > 0) {
      await supabase
        .from('goal_template_phases')
        .delete()
        .in('id', phasesToDelete)
    }
  } else if (updates.actions !== undefined) {
    // 向后兼容：单阶段行动更新
    // 获取第一个阶段（或创建）
    const { data: phases } = await supabase
      .from('goal_template_phases')
      .select('id')
      .eq('goal_template_id', templateId)
      .order('order_index', { ascending: true })
      .limit(1)

    let phaseId: string
    if (phases && phases.length > 0) {
      phaseId = phases[0].id
    } else {
      // 创建第一个阶段
      const { data: newPhase, error: phaseError } = await supabase
        .from('goal_template_phases')
        .insert({
          goal_template_id: templateId,
          name: updates.phase_name || '阶段 1',
          description: updates.phase_description || null,
          order_index: 0,
        })
        .select()
        .single()

      if (phaseError || !newPhase) {
        console.error('Error creating phase:', phaseError)
        return false
      }

      phaseId = newPhase.id
    }

    // 删除旧的行动
    await supabase
      .from('goal_template_actions')
      .delete()
      .eq('phase_id', phaseId)

    // 插入新的行动
    if (updates.actions.length > 0) {
      const actionsToInsert = updates.actions.map((action, index) => ({
        goal_template_id: templateId,
        phase_id: phaseId,
        action_template_id: action.action_template_id || null,
        title_template: action.title_template,
        definition: action.definition,
        estimated_time: action.estimated_time,
        order_index: action.order_index ?? index,
      }))

      const { error: actionsError } = await supabase
        .from('goal_template_actions')
        .insert(actionsToInsert)

      if (actionsError) {
        console.error('Error updating goal template actions:', actionsError)
        return false
      }
    }

    // 更新向后兼容字段
    if (updates.phase_name !== undefined) templateUpdates.phase_name = updates.phase_name
    if (updates.phase_description !== undefined) templateUpdates.phase_description = updates.phase_description
  } else {
    // 只更新向后兼容字段
    if (updates.phase_name !== undefined) templateUpdates.phase_name = updates.phase_name
    if (updates.phase_description !== undefined) templateUpdates.phase_description = updates.phase_description
  }

  if (Object.keys(templateUpdates).length > 0) {
    const { error: updateError } = await supabase
      .from('goal_templates')
      .update(templateUpdates)
      .eq('id', templateId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating goal template:', updateError)
      return false
    }
  }

  return true
}

/**
 * 删除目标模板（允许删除系统模板）
 * 使用更直接的方式，绕过 RLS 限制（通过服务端权限）
 */
export async function deleteGoalTemplate(
  userId: string,
  templateId: string
): Promise<boolean> {
  const supabase = await createClient()

  try {
    // 步骤1：检查模板是否存在及权限
    const { data: existingTemplate, error: checkError } = await supabase
      .from('goal_templates')
      .select('id, user_id, is_system, name')
      .eq('id', templateId)
      .single()

    if (checkError || !existingTemplate) {
      console.error('Template not found:', checkError)
      return false
    }

    // 权限检查：允许删除自己的模板或系统模板
    const canDelete = 
      existingTemplate.user_id === userId || 
      existingTemplate.is_system === true

    if (!canDelete) {
      console.error('Permission denied: User cannot delete this template', {
        userId,
        templateUserId: existingTemplate.user_id,
        isSystem: existingTemplate.is_system
      })
      return false
    }

    // 步骤2：先删除关联的行动（使用服务端权限，绕过 RLS）
    // 注意：如果 RLS 策略允许删除系统模板的行动，这个操作应该成功
    const { error: actionsError, count: deletedActionsCount } = await supabase
      .from('goal_template_actions')
      .delete({ count: 'exact' })
      .eq('goal_template_id', templateId)

    if (actionsError) {
      console.error('Error deleting template actions:', actionsError)
      // 如果是权限错误，尝试继续删除模板（可能级联删除会处理）
      if (actionsError.code !== '42501' && !actionsError.message?.includes('permission')) {
        // 非权限错误，继续尝试删除模板
      } else {
        console.warn('Permission error deleting actions, but continuing with template deletion')
      }
    } else {
      console.log(`Deleted ${deletedActionsCount || 0} template actions`)
    }

    // 步骤3：删除模板本身
    // 使用更宽松的条件，确保能删除
    let deleteResult
    if (existingTemplate.is_system) {
      // 系统模板：只检查 id 和 is_system（RLS 策略应该允许删除系统模板）
      deleteResult = await supabase
        .from('goal_templates')
        .delete({ count: 'exact' })
        .eq('id', templateId)
        .eq('is_system', true)
    } else {
      // 用户模板：检查 id 和 user_id
      deleteResult = await supabase
        .from('goal_templates')
        .delete({ count: 'exact' })
        .eq('id', templateId)
        .eq('user_id', userId)
    }

    const { error: deleteError, count: deletedCount } = deleteResult

    if (deleteError) {
      console.error('Error deleting goal template:', deleteError)
      console.error('Delete error details:', {
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
        templateId,
        isSystem: existingTemplate.is_system,
        templateUserId: existingTemplate.user_id,
        currentUserId: userId
      })
      return false
    }

    // 验证删除结果 - 等待一小段时间确保数据库操作完成
    await new Promise(resolve => setTimeout(resolve, 100))

    // 再次检查模板是否还存在（使用不同的查询方式）
    const { data: stillExists, error: verifyError } = await supabase
      .from('goal_templates')
      .select('id, name, is_system, user_id')
      .eq('id', templateId)
      .maybeSingle()

    if (verifyError && verifyError.code !== 'PGRST116') {
      // 不是"未找到"的错误，记录它
      console.warn('Error verifying deletion:', verifyError)
    }

    if (stillExists) {
      console.error('Template still exists after deletion attempt!', {
        templateId,
        template: stillExists,
        deletedCount,
        isSystem: existingTemplate.is_system,
        templateUserId: existingTemplate.user_id,
        currentUserId: userId,
        error: deleteError
      })
      return false
    }

    // 验证删除成功
    if (deletedCount === 0 || deletedCount === null) {
      // 虽然 deletedCount 为 0，但模板已经不存在了，可能是级联删除
      console.log('Template was deleted (possibly by cascade or RLS), deletedCount:', deletedCount)
      return true
    }

    console.log(`Successfully deleted template ${templateId} (${deletedCount} row(s))`)
    return true

  } catch (error) {
    console.error('Unexpected error in deleteGoalTemplate:', error)
    return false
  }
}

