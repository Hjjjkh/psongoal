import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createActionTemplate } from '@/lib/action-templates'

/**
 * 初始化默认行动模板
 * POST /api/action-templates/init-defaults
 * 为当前用户创建一些合理且迫切需要的默认模板
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 检查用户是否已有模板
    const { data: existingTemplates } = await supabase
      .from('action_templates')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (existingTemplates && existingTemplates.length > 0) {
      return NextResponse.json(
        { 
          message: '您已有模板，跳过初始化',
          skipped: true 
        },
        { status: 200 }
      )
    }

    // 定义默认模板
    // 这些模板基于"每日唯一行动"理念，简单、可执行、适合个人成长
    const defaultTemplates = [
      // 健康类 - 基础习惯养成
      {
        category: 'health' as const,
        title: '晨间运动',
        definition: '完成15-30分钟的晨间运动，可以是慢跑、快走、瑜伽或简单的拉伸。目标是激活身体，提升一天的能量水平。',
        estimated_time: 20,
      },
      {
        category: 'health' as const,
        title: '冥想/正念练习',
        definition: '进行10-20分钟的冥想或正念练习，专注于呼吸，让思绪平静下来。有助于提升专注力和情绪管理。',
        estimated_time: 15,
      },
      {
        category: 'health' as const,
        title: '健康饮食记录',
        definition: '记录今天的三餐，关注营养搭配。可以选择记录一餐的详细内容，或者记录全天的饮食概况。',
        estimated_time: 5,
      },
      {
        category: 'health' as const,
        title: '充足睡眠准备',
        definition: '在睡前1小时开始准备：关闭电子设备、调暗灯光、进行放松活动（如阅读、听轻音乐）。目标是提升睡眠质量。',
        estimated_time: 10,
      },

      // 学习类 - 持续成长
      {
        category: 'learning' as const,
        title: '阅读学习',
        definition: '阅读30分钟以上，可以是专业书籍、文学作品或感兴趣的领域。记录关键观点或心得。',
        estimated_time: 30,
      },
      {
        category: 'learning' as const,
        title: '技能练习',
        definition: '针对某个技能进行30-60分钟的刻意练习。可以是编程、语言、乐器、写作等任何你想提升的技能。',
        estimated_time: 45,
      },
      {
        category: 'learning' as const,
        title: '知识整理',
        definition: '整理今天学到的知识，可以是写笔记、制作思维导图、或者向他人讲解。目标是加深理解和记忆。',
        estimated_time: 20,
      },
      {
        category: 'learning' as const,
        title: '在线课程学习',
        definition: '完成一节在线课程的学习，可以是视频课程、音频课程或互动课程。记录学习要点。',
        estimated_time: 30,
      },

      // 项目类 - 目标推进
      {
        category: 'project' as const,
        title: '项目进度推进',
        definition: '推进当前项目的一个具体步骤。可以是完成一个小任务、解决一个问题、或者做出一个决策。',
        estimated_time: 60,
      },
      {
        category: 'project' as const,
        title: '项目规划与复盘',
        definition: '花时间规划项目的下一步，或者复盘已完成的部分。记录进展、问题和改进方向。',
        estimated_time: 30,
      },
      {
        category: 'project' as const,
        title: '重要沟通',
        definition: '完成一个重要的沟通任务，可以是会议、邮件、电话或面对面交流。确保信息传达清晰，目标达成。',
        estimated_time: 30,
      },
      {
        category: 'project' as const,
        title: '文档整理',
        definition: '整理项目相关的文档、资料或笔记。保持项目信息的清晰和可访问性。',
        estimated_time: 20,
      },

      // 自定义类 - 个人习惯
      {
        category: 'custom' as const,
        title: '日记/反思',
        definition: '记录今天的经历、感受和思考。可以是文字日记、语音记录或简单的反思笔记。',
        estimated_time: 15,
      },
      {
        category: 'custom' as const,
        title: '整理环境',
        definition: '整理工作或生活空间的一个区域。可以是桌面、书架、衣柜或数字文件。目标是保持环境的整洁有序。',
        estimated_time: 20,
      },
      {
        category: 'custom' as const,
        title: '社交联系',
        definition: '主动联系一位朋友、家人或同事。可以是电话、消息或见面。维护重要的人际关系。',
        estimated_time: 15,
      },
      {
        category: 'custom' as const,
        title: '创意输出',
        definition: '进行一项创意活动，可以是写作、绘画、摄影、音乐创作等。享受创造的过程。',
        estimated_time: 30,
      },
    ]

    // 批量创建模板
    const createdTemplates = []
    const errors = []

    for (const template of defaultTemplates) {
      const result = await createActionTemplate(user.id, template)
      if (result) {
        createdTemplates.push(result)
      } else {
        errors.push(template.title)
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: `成功创建 ${createdTemplates.length} 个模板，${errors.length} 个失败`,
          created: createdTemplates.length,
          failed: errors.length,
          errors,
        },
        { status: 207 } // 207 Multi-Status
      )
    }

    return NextResponse.json(
      {
        message: `成功创建 ${createdTemplates.length} 个默认模板`,
        count: createdTemplates.length,
        templates: createdTemplates,
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error initializing default templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

