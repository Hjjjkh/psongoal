'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Target, BarChart3, ArrowRight, TrendingUp } from 'lucide-react'

interface Action {
  id: string
  title: string
  definition: string
  estimated_time: number | null
}

interface Goal {
  id: string
  name: string
  category: string
}

interface GoalProgress {
  total: number
  completed: number
  percentage: number
}

interface HomeViewProps {
  hasCurrentAction: boolean
  todayCompleted: boolean
  currentAction: Action | null
  currentGoal: Goal | null
  goalProgress: GoalProgress | null
  consecutiveDays: number
  isGoalCompleted?: boolean
}

export default function HomeView({
  hasCurrentAction,
  todayCompleted,
  currentAction,
  currentGoal,
  goalProgress,
  consecutiveDays,
  isGoalCompleted = false,
}: HomeViewProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-500 text-transparent bg-clip-text">
            目标执行中心
          </h1>
        </div>

        {/* 今日状态卡片 - 最突出 */}
        <Card className={`border-2 ${todayCompleted ? 'border-green-500 dark:border-green-600' : hasCurrentAction ? 'border-orange-500 dark:border-orange-600' : 'border-muted'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              {todayCompleted ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <span>今日已完成</span>
                </>
              ) : hasCurrentAction ? (
                <>
                  <Target className="w-6 h-6 text-orange-600" />
                  <span>今日待完成</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-6 h-6 text-muted-foreground" />
                  <span>今日状态</span>
                </>
              )}
            </CardTitle>
            <CardDescription className="text-base">
              {todayCompleted
                ? '今天你已经完成了行动，继续保持！'
                : hasCurrentAction
                ? '去完成今日行动，持续进步'
                : '当前没有待完成的行动'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayCompleted ? (
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✅ 今天你已经完成了行动，明天将自动显示下一个行动
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => router.push('/dashboard')} className="flex-1" size="lg">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    查看复盘
                  </Button>
                  <Button onClick={() => router.push('/goals')} variant="outline" className="flex-1" size="lg">
                    <Target className="w-4 h-4 mr-2" />
                    目标规划
                  </Button>
                </div>
              </div>
            ) : hasCurrentAction && currentAction ? (
              <div className="space-y-4">
                {currentGoal && (
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{currentGoal.name || '当前目标'}</span>
                      {goalProgress && (
                        <span className="text-xs text-muted-foreground">
                          {goalProgress.completed} / {goalProgress.total} 个行动
                        </span>
                      )}
                    </div>
                    {goalProgress && (
                      <div className="w-full bg-background rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${goalProgress.percentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 p-4 rounded-lg border border-primary/20">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{currentAction.title}</h3>
                    {currentAction.definition && (
                      <p className="text-sm text-muted-foreground">{currentAction.definition}</p>
                    )}
                    {currentAction.estimated_time && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>预计时间：{currentAction.estimated_time} 分钟</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button onClick={() => router.push('/today')} className="w-full" size="lg">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  去完成今日行动
                </Button>
              </div>
            ) : isGoalCompleted ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg border-2 border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      目标已完成！
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    恭喜你完成了当前目标！现在可以创建新目标，继续你的成长之旅。
                  </p>
                  <Button 
                    onClick={() => router.push('/goals')} 
                    className="w-full bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90" 
                    size="lg"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    创建新目标
                  </Button>
                </div>
                <Button 
                  onClick={() => router.push('/dashboard')} 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  查看完成统计
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  当前没有待完成的行动，去规划页面创建或设置目标吧
                </p>
                <Button onClick={() => router.push('/goals')} className="w-full" size="lg">
                  <Target className="w-4 h-4 mr-2" />
                  去规划目标
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 快速操作面板 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/today')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span>今日行动</span>
              </CardTitle>
              <CardDescription>
                {hasCurrentAction && !todayCompleted
                  ? '完成今日唯一行动'
                  : '查看今日行动状态'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start" onClick={() => router.push('/today')}>
                前往 <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/goals')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span>目标规划</span>
              </CardTitle>
              <CardDescription>
                管理目标、阶段和行动
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start" onClick={() => router.push('/goals')}>
                前往 <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <span>复盘看板</span>
              </CardTitle>
              <CardDescription>
                查看统计数据和趋势
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start" onClick={() => router.push('/dashboard')}>
                前往 <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 关键指标 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span>连续完成天数</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-center py-4">
                {consecutiveDays}
                <span className="text-2xl text-muted-foreground ml-2">天</span>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {consecutiveDays > 0
                  ? todayCompleted
                    ? `已连续完成 ${consecutiveDays} 天（含今天），继续保持！`
                    : `已连续完成 ${consecutiveDays} 天，今天还未完成`
                  : '还没有完成记录，从今天开始吧'}
              </p>
            </CardContent>
          </Card>

          {currentGoal && goalProgress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <span>目标进度</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{currentGoal.name || '当前目标'}</span>
                    <span className="text-2xl font-bold">{goalProgress.percentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-primary to-blue-500 h-3 rounded-full transition-all"
                      style={{ width: `${goalProgress.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {goalProgress.completed} / {goalProgress.total} 个行动已完成
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

