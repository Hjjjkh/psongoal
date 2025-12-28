import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GOAL_TEMPLATES } from '@/lib/templates'

/**
 * 初始化默认目标模板
 * 将硬编码的模板迁移到数据库
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查表是否存在
    const { error: tableCheckError } = await supabase
      .from('goal_templates')
      .select('id')
      .limit(1)

    if (tableCheckError) {
      // 表不存在或权限问题
      if (tableCheckError.code === '42P01' || tableCheckError.message?.includes('relation')) {
        return NextResponse.json(
          { 
            error: 'Table not found',
            code: 'TABLE_NOT_FOUND',
            message: '请先在 Supabase 中执行 migration_add_goal_templates.sql'
          },
          { status: 503 }
        )
      }
      console.error('Error checking table:', tableCheckError)
      return NextResponse.json(
        { error: 'Database error', details: tableCheckError.message },
        { status: 500 }
      )
    }

    // 检查是否已有系统模板（如果存在，先删除旧的，然后重新创建）
    const { data: existingTemplates, error: existingError } = await supabase
      .from('goal_templates')
      .select('id')
      .eq('is_system', true)

    if (existingError) {
      console.error('Error checking existing templates:', existingError)
      // 继续执行，可能是 RLS 策略问题
    } else if (existingTemplates && existingTemplates.length > 0) {
      // 删除旧的系统模板及其行动
      const existingIds = existingTemplates.map(t => t.id)
      // 先删除行动
      await supabase
        .from('goal_template_actions')
        .delete()
        .in('goal_template_id', existingIds)
      // 再删除模板
      await supabase
        .from('goal_templates')
        .delete()
        .in('id', existingIds)
      // 已删除旧的系统模板
    }

    // 创建系统模板（支持多阶段 - 为每个阶段创建独立模板）
    const templates = Object.values(GOAL_TEMPLATES)
    const createdTemplates = []

    for (const template of templates) {
      // 支持多阶段模板：使用 phases 数组，如果没有则使用 phase（向后兼容）
      const phasesToCreate = template.phases && template.phases.length > 0
        ? template.phases
        : (template.phase ? [template.phase] : [])

      if (phasesToCreate.length === 0) {
        console.warn(`Template ${template.category} has no phases`)
        continue
      }

      // 为每个阶段创建独立的模板（这样用户可以选择不同阶段的模板）
      const categoryNames = {
        health: '健身',
        learning: '学习',
        project: '项目',
      }

      // 创建单个多阶段模板（而不是为每个阶段创建独立模板）
      // 创建模板
      const { data: createdTemplate, error: templateError } = await supabase
        .from('goal_templates')
        .insert({
          user_id: user.id, // 系统模板也需要 user_id，但标记为 is_system
          category: template.category,
          name: `${categoryNames[template.category]}目标模板`,
          phase_name: phasesToCreate[0].name, // 向后兼容字段
          phase_description: phasesToCreate[0].description, // 向后兼容字段
          description: `包含 ${phasesToCreate.length} 个阶段：${phasesToCreate.map(p => p.name).join(' → ')}`,
          is_system: true,
        })
        .select()
        .single()

      if (templateError || !createdTemplate) {
        console.error(`Error creating system template:`, templateError)
        // 如果是权限错误，返回更详细的错误信息
        if (templateError?.code === '42501' || templateError?.message?.includes('permission')) {
          return NextResponse.json(
            { 
              error: 'Permission denied',
              code: 'PERMISSION_DENIED',
              message: '请检查 RLS 策略，确保允许插入系统模板',
              details: templateError.message
            },
            { status: 403 }
          )
        }
        continue
      }

      // 创建所有阶段
      for (let phaseIndex = 0; phaseIndex < phasesToCreate.length; phaseIndex++) {
        const phase = phasesToCreate[phaseIndex]
        
        // 创建阶段
        const { data: createdPhase, error: phaseError } = await supabase
          .from('goal_template_phases')
          .insert({
            goal_template_id: createdTemplate.id,
            name: phase.name,
            description: phase.description,
            order_index: phaseIndex,
          })
          .select()
          .single()

        if (phaseError || !createdPhase) {
          console.error(`Error creating phase ${phaseIndex + 1}:`, phaseError)
          // 删除已创建的模板
          await supabase.from('goal_templates').delete().eq('id', createdTemplate.id)
          continue
        }

        // 创建行动关联
        if (phase.exampleActions && phase.exampleActions.length > 0) {
          const actionsToInsert = phase.exampleActions.map((action, index) => ({
            goal_template_id: createdTemplate.id,
            phase_id: createdPhase.id,
            action_template_id: null,
            title_template: action.titleTemplate,
            definition: action.definition,
            estimated_time: action.estimatedTime,
            order_index: index,
          }))

          const { error: actionsError } = await supabase
            .from('goal_template_actions')
            .insert(actionsToInsert)

          if (actionsError) {
            console.error(`Error creating template actions for phase ${phaseIndex + 1}:`, actionsError)
            // 删除已创建的阶段和模板
            await supabase.from('goal_template_phases').delete().eq('id', createdPhase.id)
            await supabase.from('goal_templates').delete().eq('id', createdTemplate.id)
            continue
          }
        }
      }

      createdTemplates.push(createdTemplate)
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdTemplates.length} default templates`,
      data: createdTemplates,
    })
  } catch (error) {
    console.error('Error initializing default templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

