import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserGoalTemplates, createGoalTemplate } from '@/lib/goal-templates'

/**
 * 获取目标模板列表
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as 'health' | 'learning' | 'project' | 'custom' | null

    try {
      const templates = await getUserGoalTemplates(user.id, category || undefined)
      return NextResponse.json(
        { success: true, data: templates },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      )
    } catch (error) {
      // 检查是否是表不存在错误
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorCode = (error as { code?: string })?.code
      
      if (errorCode === '42P01' || errorMessage?.includes('relation') || errorMessage?.includes('table')) {
        return NextResponse.json(
          { 
            error: 'Table not found',
            code: 'TABLE_NOT_FOUND',
            message: '请先在 Supabase 中执行 migration_add_goal_templates.sql'
          },
          { status: 503 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error('Error fetching goal templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 创建目标模板
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { category, name, phase_name, phase_description, description, actions, phases } = body

    // 验证输入
    if (!category || !['health', 'learning', 'project', 'custom'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // 验证阶段（多阶段优先，否则使用单阶段）
    if (phases) {
      if (!Array.isArray(phases) || phases.length === 0) {
        return NextResponse.json({ error: 'Phases must be a non-empty array' }, { status: 400 })
      }
      for (const phase of phases) {
        if (!phase.name || typeof phase.name !== 'string' || phase.name.trim().length === 0) {
          return NextResponse.json({ error: 'Each phase must have a name' }, { status: 400 })
        }
        if (phase.actions && !Array.isArray(phase.actions)) {
          return NextResponse.json({ error: 'Phase actions must be an array' }, { status: 400 })
        }
      }
    } else {
      // 向后兼容：单阶段
      if (!phase_name || typeof phase_name !== 'string' || phase_name.trim().length === 0) {
        return NextResponse.json({ error: 'Phase name is required' }, { status: 400 })
      }
      // 验证行动（如果提供）
      if (actions && !Array.isArray(actions)) {
        return NextResponse.json({ error: 'Actions must be an array' }, { status: 400 })
      }
    }

    const template = await createGoalTemplate(user.id, phases
      ? {
          category,
          name: name.trim(),
          description: description || null,
          phases: phases.map((p: any) => ({
            name: p.name.trim(),
            description: p.description || null,
            actions: p.actions || [],
          })),
        }
      : {
          category,
          name: name.trim(),
          phase_name: phase_name.trim(),
          phase_description: phase_description || null,
          description: description || null,
          actions: actions || [],
        }
    )

    if (!template) {
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error('Error creating goal template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

