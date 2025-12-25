'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Goal } from '@/lib/types'
import { TrendingUp, AlertCircle } from 'lucide-react'

interface GoalWithStats extends Goal {
  progress: number
  totalActions: number
  completedActions: number
  stuckPhases: Array<{ phaseId: string; days: number }>
}

interface DashboardViewProps {
  goals: GoalWithStats[]
  consecutiveDays: number
}

export default function DashboardView({ goals, consecutiveDays }: DashboardViewProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">复盘看板</h1>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.push('/today')}>
              今日
            </Button>
            <Button variant="ghost" onClick={() => router.push('/goals')}>
              规划
            </Button>
          </div>
        </div>

        {/* 连续完成天数 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              连续完成天数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{consecutiveDays}</div>
            <p className="text-sm text-muted-foreground mt-2">
              {consecutiveDays > 0
                ? `已连续完成 ${consecutiveDays} 天，继续保持！`
                : '还没有完成记录，从今天开始吧'}
            </p>
          </CardContent>
        </Card>

        {/* 目标进度 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">目标进度</h2>
          {goals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">还没有目标，前往规划页面创建</p>
                <Button
                  className="mt-4"
                  onClick={() => router.push('/goals')}
                >
                  前往规划
                </Button>
              </CardContent>
            </Card>
          ) : (
            goals.map((goal) => (
              <Card key={goal.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{goal.name}</CardTitle>
                      <CardDescription>
                        {goal.completedActions} / {goal.totalActions} 个行动已完成
                      </CardDescription>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {goal.category}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 进度条 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>进度</span>
                      <span className="font-semibold">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* 卡住的阶段 */}
                  {goal.stuckPhases.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">有阶段卡住了</span>
                      </div>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        {goal.stuckPhases.length} 个阶段超过 7 天未完成
                      </p>
                    </div>
                  )}

                  {/* 状态 */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">状态：</span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        goal.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                          : goal.status === 'completed'
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                          : 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {goal.status === 'active'
                        ? '进行中'
                        : goal.status === 'completed'
                        ? '已完成'
                        : '已暂停'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

