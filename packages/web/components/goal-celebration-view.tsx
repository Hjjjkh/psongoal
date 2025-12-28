'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Trophy, Sparkles, Target, Calendar, CheckCircle2, TrendingUp, Zap } from 'lucide-react'
import type { Goal } from '@/lib/types'
import { sendGoalCompletionReminder } from '@/lib/reminder-manager'

interface GoalCelebrationViewProps {
  goal: Goal
  totalActions: number
  completedActions: number
  startDate: string
  endDate: string
  consecutiveDays: number
  avgDifficulty?: number | null
  avgEnergy?: number | null
  executionDates?: string[]
}

/**
 * 目标完成庆祝页面
 * 用于在用户完成目标时提供成就感和引导下一步
 */
export default function GoalCelebrationView({
  goal,
  totalActions,
  completedActions,
  startDate,
  endDate,
  consecutiveDays,
  avgDifficulty,
  avgEnergy,
  executionDates = [],
}: GoalCelebrationViewProps) {
  const router = useRouter()
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    // 延迟显示动画，增强视觉冲击
    const timer = setTimeout(() => setShowAnimation(true), 100)
    
    // 发送目标完成提醒
    if (goal?.name) {
      sendGoalCompletionReminder(goal.name)
    }
    
    return () => clearTimeout(timer)
  }, [goal])

  // 计算完成天数
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // 计算完成率
  const completionRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <Card className="max-w-2xl w-full shadow-2xl border-2 border-primary/20">
        <CardContent className="p-8 md:p-12">
          <div className="text-center space-y-6">
            {/* 庆祝图标和标题 */}
            <div className={`space-y-4 transition-all duration-1000 ${showAnimation ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <div className="flex justify-center">
                <div className="relative">
                  <Trophy className="w-24 h-24 text-yellow-500 animate-bounce" />
                  <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
                </div>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-yellow-500 text-transparent bg-clip-text">
                目标已完成！
              </h1>
              
              <p className="text-xl text-muted-foreground">
                {goal.name || '未命名目标'}
              </p>
            </div>

            {/* 成就统计 */}
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 transition-all duration-1000 delay-300 ${showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary">{completedActions}</div>
                <div className="text-sm text-muted-foreground">完成行动</div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-500">{completionRate}%</div>
                <div className="text-sm text-muted-foreground">完成率</div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-500">{consecutiveDays}</div>
                <div className="text-sm text-muted-foreground">连续天数</div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-purple-500">{daysDiff}</div>
                <div className="text-sm text-muted-foreground">总天数</div>
              </div>
            </div>

            {/* 详细统计 */}
            {(avgDifficulty !== null || avgEnergy !== null || executionDates.length > 0) && (
              <div className={`mt-8 space-y-4 transition-all duration-1000 delay-500 ${showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <h3 className="text-xl font-semibold text-center">执行总结</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {avgDifficulty !== null && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-center mb-2">
                          <TrendingUp className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="text-2xl font-bold text-orange-500 text-center">
                          {avgDifficulty?.toFixed(1) ?? '-'}
                        </div>
                        <div className="text-sm text-muted-foreground text-center">平均难度 (1-5)</div>
                      </CardContent>
                    </Card>
                  )}
                  {avgEnergy !== null && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-center mb-2">
                          <Zap className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div className="text-2xl font-bold text-yellow-500 text-center">
                          {avgEnergy?.toFixed(1) ?? '-'}
                        </div>
                        <div className="text-sm text-muted-foreground text-center">平均精力 (1-5)</div>
                      </CardContent>
                    </Card>
                  )}
                  {executionDates.length > 0 && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-center mb-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="text-2xl font-bold text-green-500 text-center">
                          {executionDates.length}
                        </div>
                        <div className="text-sm text-muted-foreground text-center">完成次数</div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* 鼓励文案 */}
            <div className={`mt-8 p-6 bg-primary/10 rounded-lg border border-primary/20 transition-all duration-1000 delay-500 ${showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <p className="text-lg text-foreground">
                恭喜你坚持完成了这个目标！你的努力和坚持值得庆祝。
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                继续保持这个节奏，开始下一个挑战吧！
              </p>
            </div>

            {/* 操作按钮 */}
            <div className={`flex flex-col gap-4 mt-8 transition-all duration-1000 delay-700 ${showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <Button
                onClick={() => router.push('/goals')}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary via-primary/90 to-blue-500 hover:from-primary/90 hover:via-primary/80 hover:to-blue-500/90 shadow-lg hover:shadow-xl transition-all"
              >
                <Target className="w-5 h-5 mr-2" />
                立即创建新目标
              </Button>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="w-full h-12 text-base"
              >
                查看复盘数据
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

