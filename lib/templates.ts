/**
 * 目标创建模板定义
 * 仅用于目标创建功能，提供 3 类固定模板：健身、学习、项目
 * 
 * 模板结构：
 * - 每个模板包含一个基础 Phase（名称和描述）
 * - 每个模板包含示例 Action（title 模板、definition、estimated_time）
 * - Action 使用 {n} 占位符，支持批量生成
 */

export type TemplateCategory = 'health' | 'learning' | 'project'

export interface TemplateAction {
  titleTemplate: string  // 例如："核心训练 Day {n}"
  definition: string     // 完成标准
  estimatedTime: number | null  // 预计时间（分钟）
  tags?: string[]       // 标签（仅用于预览显示，不保存到数据库）
  priority?: 'low' | 'medium' | 'high'  // 优先级（仅用于预览显示，不保存到数据库）
}

export interface TemplatePhase {
  name: string
  description: string | null  // 支持 Markdown 格式
  exampleActions: TemplateAction[]
}

export interface GoalTemplate {
  category: TemplateCategory
  phase: TemplatePhase
}

/**
 * 目标创建模板定义
 * 仅用于目标创建，每个类别只有一个固定模板
 */
export const GOAL_TEMPLATES: Record<TemplateCategory, GoalTemplate> = {
  health: {
    category: 'health',
    phase: {
      name: '基础训练阶段',
      description: '建立基础体能和习惯\n\n**训练原则：**\n- 循序渐进，避免过度训练\n- 注重动作质量而非数量\n- 保持规律性，每周至少 3-4 次',
      exampleActions: [
        {
          titleTemplate: '核心训练 Day {n}',
          definition: '完成 3 组平板支撑，每组 60 秒',
          estimatedTime: 15,
          tags: ['核心', '力量'],
          priority: 'medium',
        },
        {
          titleTemplate: '有氧运动 Day {n}',
          definition: '完成 30 分钟慢跑或快走',
          estimatedTime: 30,
          tags: ['有氧', '耐力'],
          priority: 'high',
        },
      ],
    },
  },
  learning: {
    category: 'learning',
    phase: {
      name: '基础学习阶段',
      description: '建立学习习惯和基础知识\n\n**学习方法：**\n- 采用主动回忆法，提高记忆效率\n- 定期复习，遵循艾宾浩斯遗忘曲线\n- 理论与实践相结合',
      exampleActions: [
        {
          titleTemplate: '学习 Day {n}',
          definition: '完成 1 小时专注学习，并记录学习笔记',
          estimatedTime: 60,
          tags: ['学习', '笔记'],
          priority: 'high',
        },
        {
          titleTemplate: '复习 Day {n}',
          definition: '复习前 3 天的学习内容，完成练习题',
          estimatedTime: 45,
          tags: ['复习', '练习'],
          priority: 'medium',
        },
      ],
    },
  },
  project: {
    category: 'project',
    phase: {
      name: '项目启动阶段',
      description: '完成项目初始化和核心功能\n\n**项目管理要点：**\n- 明确项目目标和里程碑\n- 每日复盘，及时调整计划\n- 保持代码质量和文档同步',
      exampleActions: [
        {
          titleTemplate: '项目任务 Day {n}',
          definition: '完成当日计划的功能开发或任务',
          estimatedTime: 120,
          tags: ['开发', '功能'],
          priority: 'high',
        },
        {
          titleTemplate: '项目复盘 Day {n}',
          definition: '回顾当日进度，更新项目文档',
          estimatedTime: 30,
          tags: ['复盘', '文档'],
          priority: 'medium',
        },
      ],
    },
  },
}

/**
 * 获取指定类别的模板
 */
export function getTemplate(category: TemplateCategory): GoalTemplate {
  return GOAL_TEMPLATES[category]
}

