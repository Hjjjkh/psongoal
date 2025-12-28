/**
 * 智能建议系统
 * 基于复盘数据生成个性化改进建议
 */

import type { Goal } from './types'

export interface GoalWithStats extends Goal {
  progress: number
  totalActions: number
  completedActions: number
  stuckPhases: Array<{ phaseId: string; days: number }>
}

export interface DayData {
  date: string
  completed: number
  total: number
  avgDifficulty: number | null
  avgEnergy: number | null
}

export interface Insight {
  type: 'success' | 'warning' | 'info' | 'suggestion'
  title: string
  description: string
  action?: string
  priority: 'high' | 'medium' | 'low'
}

interface InsightContext {
  goals: GoalWithStats[]
  consecutiveDays: number
  dailyStats: DayData[]
  hasCurrentAction: boolean
  todayCompleted: boolean
}

/**
 * 生成智能建议
 */
export function generateInsights(context: InsightContext): Insight[] {
  const insights: Insight[] = []
  const { goals, consecutiveDays, dailyStats, hasCurrentAction, todayCompleted } = context

  // 1. 连续完成天数建议
  if (consecutiveDays === 0) {
    insights.push({
      type: 'info',
      title: '开始你的执行之旅',
      description: '还没有完成记录，从今天开始完成第一个行动吧！',
      priority: 'high',
    })
  } else if (consecutiveDays >= 7 && consecutiveDays < 30) {
    insights.push({
      type: 'success',
      title: '保持良好势头',
      description: `已连续完成 ${consecutiveDays} 天，继续保持这个节奏！`,
      priority: 'medium',
    })
  } else if (consecutiveDays >= 30) {
    insights.push({
      type: 'success',
      title: '执行习惯已养成',
      description: `连续完成 ${consecutiveDays} 天，你已经养成了良好的执行习惯！`,
      priority: 'low',
    })
  } else if (consecutiveDays > 0 && !todayCompleted && hasCurrentAction) {
    insights.push({
      type: 'warning',
      title: '保持连续记录',
      description: `已连续完成 ${consecutiveDays} 天，今天还未完成，快去完成今日行动保持连续！`,
      action: '去完成今日行动',
      priority: 'high',
    })
  }

  // 2. 完成率分析（基于有记录的天数，更准确）
  const completedDays = dailyStats.filter(d => d.completed > 0).length
  const daysWithRecords = dailyStats.filter(d => d.total > 0).length
  const totalDays = dailyStats.length
  
  // 完成率：如果有记录的天数 > 0，基于有记录的天数计算；否则基于总天数计算
  const completionRate = daysWithRecords > 0
    ? (completedDays / daysWithRecords) * 100
    : (totalDays > 0 ? (completedDays / totalDays) * 100 : 0)

  if (daysWithRecords >= 7) {
    if (completionRate < 50) {
      insights.push({
        type: 'warning',
        title: '完成率偏低',
        description: `最近 ${daysWithRecords} 天中有记录的 ${completedDays} 天完成了（${completionRate.toFixed(0)}%），建议调整行动难度或时间安排。`,
        priority: 'high',
      })
    } else if (completionRate >= 80 && completedDays >= 7) {
      insights.push({
        type: 'success',
        title: '完成率优秀',
        description: `最近 ${daysWithRecords} 天中有记录的 ${completedDays} 天完成了（${completionRate.toFixed(0)}%），执行情况很好！`,
        priority: 'low',
      })
    } else if (completionRate >= 60 && completionRate < 80) {
      insights.push({
        type: 'info',
        title: '完成率良好',
        description: `最近 ${daysWithRecords} 天中有记录的 ${completedDays} 天完成了（${completionRate.toFixed(0)}%），继续保持！`,
        priority: 'low',
      })
    }
  }

  // 3. 难度趋势分析
  const difficultyData = dailyStats
    .filter(d => d.avgDifficulty !== null && d.completed > 0)
    .map(d => d.avgDifficulty!)
  
  if (difficultyData.length >= 7) {
    // 使用最近7天和之前7天对比，更准确
    const recentCount = Math.min(7, difficultyData.length)
    const earlierCount = Math.min(7, difficultyData.length - recentCount)
    
    if (earlierCount > 0) {
      const recentAvg = difficultyData.slice(-recentCount).reduce((a, b) => a + b, 0) / recentCount
      const earlierAvg = difficultyData.slice(0, earlierCount).reduce((a, b) => a + b, 0) / earlierCount
      const diff = recentAvg - earlierAvg
      
      if (diff > 0.5) {
        insights.push({
          type: 'warning',
          title: '难度持续上升',
          description: `最近 ${recentCount} 天完成的行动平均难度为 ${recentAvg.toFixed(1)}/5，比之前 ${earlierCount} 天提升了 ${diff.toFixed(1)}。如果感到吃力，建议适当降低难度或调整计划。`,
          priority: 'medium',
        })
      } else if (diff < -0.5) {
        insights.push({
          type: 'suggestion',
          title: '难度有所下降',
          description: `最近 ${recentCount} 天完成的行动平均难度为 ${recentAvg.toFixed(1)}/5，比之前 ${earlierCount} 天降低了 ${Math.abs(diff).toFixed(1)}。如果感觉轻松，可以考虑适当增加挑战。`,
          priority: 'low',
        })
      }
    }
  } else if (difficultyData.length >= 3) {
    // 数据较少时，只给出简单提示
    const avg = difficultyData.reduce((a, b) => a + b, 0) / difficultyData.length
    if (avg > 4) {
      insights.push({
        type: 'info',
        title: '当前难度较高',
        description: `最近完成的行动平均难度为 ${avg.toFixed(1)}/5，如果感到吃力，可以考虑适当降低难度。`,
        priority: 'low',
      })
    }
  }

  // 4. 精力趋势分析
  const energyData = dailyStats
    .filter(d => d.avgEnergy !== null && d.completed > 0)
    .map(d => d.avgEnergy!)
  
  if (energyData.length >= 7) {
    // 使用最近7天和之前7天对比，更准确
    const recentCount = Math.min(7, energyData.length)
    const earlierCount = Math.min(7, energyData.length - recentCount)
    
    if (earlierCount > 0) {
      const recentAvg = energyData.slice(-recentCount).reduce((a, b) => a + b, 0) / recentCount
      const earlierAvg = energyData.slice(0, earlierCount).reduce((a, b) => a + b, 0) / earlierCount
      const diff = recentAvg - earlierAvg
      
      if (diff < -0.5) {
        insights.push({
          type: 'warning',
          title: '精力状态下降',
          description: `最近 ${recentCount} 天完成行动时的平均精力为 ${recentAvg.toFixed(1)}/5，比之前 ${earlierCount} 天下降了 ${Math.abs(diff).toFixed(1)}。建议适当休息，调整作息，或考虑降低行动难度。`,
          priority: 'medium',
        })
      } else if (diff > 0.5) {
        insights.push({
          type: 'success',
          title: '精力状态良好',
          description: `最近 ${recentCount} 天完成行动时的平均精力为 ${recentAvg.toFixed(1)}/5，比之前 ${earlierCount} 天提升了 ${diff.toFixed(1)}。继续保持！`,
          priority: 'low',
        })
      }
    }
  } else if (energyData.length >= 3) {
    // 数据较少时，只给出简单提示
    const avg = energyData.reduce((a, b) => a + b, 0) / energyData.length
    if (avg < 2) {
      insights.push({
        type: 'warning',
        title: '精力状态较低',
        description: `最近完成行动时的平均精力为 ${avg.toFixed(1)}/5，建议适当休息，调整作息。`,
        priority: 'medium',
      })
    }
  }

  // 5. 卡住阶段提醒
  const stuckPhases = goals.flatMap(goal => goal.stuckPhases || [])
  if (stuckPhases.length > 0) {
    const maxDays = Math.max(...stuckPhases.map(p => p.days))
    insights.push({
      type: 'warning',
      title: '有阶段卡住了',
      description: `有 ${stuckPhases.length} 个阶段超过 7 天未完成，最长已卡住 ${maxDays} 天。建议重新评估这些阶段的难度或调整计划。`,
      priority: 'high',
    })
  }

  // 6. 目标进度建议
  const activeGoals = goals.filter(g => g.status === 'active')
  activeGoals.forEach(goal => {
    if (goal.progress === 0 && goal.totalActions > 0) {
      insights.push({
        type: 'info',
        title: `目标"${goal.name}"尚未开始`,
        description: '目标已设置但还没有完成任何行动，去完成第一个行动开始吧！',
        priority: 'medium',
      })
    } else if (goal.progress > 0 && goal.progress < 30 && goal.totalActions > 5) {
      insights.push({
        type: 'suggestion',
        title: `目标"${goal.name}"进度较慢`,
        description: `当前进度 ${goal.progress}%，已完成 ${goal.completedActions}/${goal.totalActions} 个行动。如果进度偏慢，可以考虑调整计划。`,
        priority: 'low',
      })
    } else if (goal.progress >= 80 && goal.progress < 100) {
      insights.push({
        type: 'success',
        title: `目标"${goal.name}"接近完成`,
        description: `当前进度 ${goal.progress}%，已完成 ${goal.completedActions}/${goal.totalActions} 个行动。加油，快完成了！`,
        priority: 'low',
      })
    }
  })

  // 7. 今天状态提醒
  // 【重要】只有在今天未完成且有当前行动时才显示
  if (!todayCompleted && hasCurrentAction) {
    insights.push({
      type: 'info',
      title: '今日行动待完成',
      description: '今天还没有完成行动，快去完成今日行动保持连续记录！',
      action: '去完成今日行动',
      priority: 'high',
    })
  } else if (todayCompleted) {
    // 今天已完成，给出鼓励
    insights.push({
      type: 'success',
      title: '今日已完成',
      description: '🎉 今天你已经完成了行动，继续保持这个节奏！',
      priority: 'low',
    })
  }

  // 按优先级排序
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return insights
}

