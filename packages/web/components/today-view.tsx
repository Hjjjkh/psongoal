'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Goal, Phase, Action } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { handleApiResponse } from '@/lib/utils'
import CompletionAnimation from '@/components/completion-animation'
import { sendCompletionCelebration } from '@/lib/notifications'
import { useReminder } from '@/hooks/use-reminder'
import TodosList from '@/components/todos-list'
import FocusTimer from '@/components/focus-timer'
import { Timer, ListTodo } from 'lucide-react'

/**
 * 【执行力强化】精简的 Props
 * 移除 execution：不关心"今天是否已记录"，所有判断交由后端处理
 */
interface TodayViewProps {
  goal: Goal | null
  phase: Phase | null
  action: Action | null
  hasCurrentAction: boolean  // 用于区分"无 action"和"系统异常"
  hasAnyGoals: boolean  // 用于区分"目标已完成"和"新用户没有目标"
  needsPhase?: boolean  // 目标需要创建阶段
  needsAction?: boolean  // 目标需要创建行动
  goalProgress?: { total: number; completed: number; percentage: number } | null  // 目标进度
  remainingActions?: number  // 剩余行动数
  consecutiveDays?: number  // 连续完成天数
  reminderEnabled?: boolean | null  // 提醒是否启用
  reminderTime?: string | null  // 提醒时间
  todayCompleted?: boolean  // 今天是否已完成
}

/**
 * 【执行力强化】今日唯一行动指令页
 * 
 * 设计原则：
 * 1. 不负责"解释系统状态"，只负责让用户对【当前唯一 Action】做出决定
 * 2. 统计数据不参与今日决策
 * 3. 必须做出三选一：完成 / 未完成 / 离开系统
 * 4. 不提供"保存""稍后再说"等缓冲操作
 */
export default function TodayView({ goal, phase, action, hasCurrentAction, hasAnyGoals, needsPhase, needsAction, goalProgress, remainingActions = 0, consecutiveDays = 0, reminderEnabled, reminderTime, todayCompleted = false }: TodayViewProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [difficulty, setDifficulty] = useState<string>('3')
  const [energy, setEnergy] = useState<string>('3')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false)
  const [isGoalCompleted, setIsGoalCompleted] = useState(false)
  const [showFocusTimer, setShowFocusTimer] = useState(false)  // 专注计时器显示状态

  // 使用提醒功能
  useReminder({
    enabled: reminderEnabled ?? null,
    reminderTime: reminderTime || null,
    actionTitle: action?.title,
    actionDefinition: action?.definition,
    todayCompleted,
    hasCurrentAction,
  })

  /**
   * 【执行力强化】状态 2：current_action_id = null 或今天已完成
   * 显示系统级提示，提供唯一出口按钮
   */
  if (!hasCurrentAction) {
    // 新用户没有目标的情况
    if (!hasAnyGoals) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">欢迎使用目标执行系统</CardTitle>
              <CardDescription className="text-base">
                还没有目标，创建第一个目标开始你的执行之旅吧
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• 创建目标，规划你的行动</p>
                <p>• 每天完成一个行动，持续进步</p>
                <p>• 查看统计，复盘你的成长</p>
              </div>
              <Button onClick={() => router.push('/goals')} className="w-full" size="lg">
                创建第一个目标
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    
    // 今天已完成或目标已完成的情况
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6 pt-20">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <span className="text-green-600">✓</span>
                <span>今日行动已完成</span>
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {goal?.name ? `恭喜完成 ${goal.name} 的今日行动！` : '恭喜完成今日行动！'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {goal && (
                <div className="text-sm text-muted-foreground space-y-1 text-center">
                  <div>目标名称：{goal.name || '未命名目标'}</div>
                  {goal.category && (
                    <div>类别：{goal.category === 'health' ? '健康' : goal.category === 'learning' ? '学习' : '项目'}</div>
                  )}
                  <div>完成日期：{(() => {
                    const today = new Date()
                    const year = today.getFullYear()
                    const month = String(today.getMonth() + 1).padStart(2, '0')
                    const day = String(today.getDate()).padStart(2, '0')
                    return `${year}年${month}月${day}日`
                  })()}</div>
                  {consecutiveDays > 0 && (
                    <div>连续完成：{consecutiveDays} 天</div>
                  )}
                </div>
              )}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-center text-green-800 dark:text-green-200">
                  🎉 继续保持！明天将自动显示下一个行动
                </p>
                {consecutiveDays > 0 && (
                  <p className="text-xs text-center text-green-700 dark:text-green-300 mt-1">
                    已连续完成 {consecutiveDays} 天
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => router.push('/dashboard')} className="flex-1" size="lg">
                  查看统计
                </Button>
                <Button onClick={() => router.push('/goals')} variant="outline" className="flex-1" size="lg">
                  目标规划
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 代办事项（只在主线完成后显示，认知降级版本，默认折叠） */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              💡 今日唯一任务已完成，如果还有精力可以处理这些代办事项
            </p>
            <TodosList show={true} />
          </div>
        </div>
      </div>
    )
  }

  /**
   * 【执行力强化】状态 1：有 current_action
   * 必须同时有 goal、phase、action 才能显示
   */
  if (!action || !goal || !phase) {
    // 目标需要创建阶段
    if (needsPhase && goal) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">📋 目标已设置</CardTitle>
              <CardDescription className="text-base">
                {goal.name || '当前目标'} 需要创建阶段和行动才能开始执行
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>阶段是目标的执行单元，将大目标拆解为小阶段</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>每个阶段包含多个行动，按顺序完成</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>创建阶段和行动后，即可开始每日执行</span>
                </p>
              </div>
              <Button onClick={() => router.push('/goals')} className="w-full" size="lg">
                去创建阶段和行动
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    
    // 目标需要创建行动
    if (needsAction && goal) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">目标已设置</CardTitle>
              <CardDescription className="text-base">
                {goal.name || '当前目标'} 还没有行动，请先创建行动
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• 行动是每天需要完成的具体任务</p>
                <p>• 创建行动后即可开始执行</p>
              </div>
              <Button onClick={() => router.push('/goals')} className="w-full" size="lg">
                去创建行动
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    
    // 其他系统异常情况
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">系统状态异常</p>
          <p className="text-muted-foreground">执行被暂停</p>
          <Button onClick={() => router.push('/goals')} variant="outline">
            返回规划页
          </Button>
        </div>
      </div>
    )
  }

  /**
   * 【执行力强化】核心交互：完成 Action
   * 不检查前端状态，直接提交，由后端判断是否允许完成
   */
  const handleComplete = () => {
    setIsDialogOpen(true)
  }

  const handleSubmitCompletion = async () => {
    if (!action || isSubmitting) return // 防止并发请求

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/complete-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: action.id,
          difficulty: parseInt(difficulty),
          energy: parseInt(energy),
        }),
      })

      const result = await handleApiResponse<{ success: boolean; nextActionId: string | null }>(response, '系统操作失败，请重试')

      if (result.success && result.data) {
        setIsDialogOpen(false)
        // 根据 nextActionId 判断是否目标已完成
        if (result.data.nextActionId === null) {
          // 目标已完成，显示动画后跳转到庆祝页面
          setIsGoalCompleted(true)
          setShowCompletionAnimation(true)
          // 发送完成通知
          sendCompletionCelebration(true)
        } else {
          // 今日行动已完成，显示动画后跳转到统计页面
          setIsGoalCompleted(false)
          setShowCompletionAnimation(true)
          // 发送完成通知
          sendCompletionCelebration(false)
        }
      }
      // handleApiResponse 已处理错误提示
    } catch (error) {
      // handleApiResponse 已处理网络错误，这里只记录日志
      // 如果需要额外处理，可以在这里添加
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * 【执行力强化】核心交互：标记未完成
   * 不检查前端状态，直接提交，由后端判断是否允许
   */
  const handleIncomplete = async () => {
    if (!action) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/mark-incomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: action.id,
        }),
      })

      const result = await handleApiResponse(response, '系统操作失败，请重试')

      if (result.success) {
        toast.success('已标记为未完成', {
          description: '明天可以继续尝试完成此行动',
          duration: 3000,
        })
        // 标记未完成后，跳转到复盘看板，让用户查看整体进度
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      }
      // handleApiResponse 已处理错误提示
    } catch (error) {
      // handleApiResponse 已处理网络错误，这里只记录日志
      // 如果需要额外处理，可以在这里添加
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * 处理完成动画结束后的跳转
   */
  const handleAnimationComplete = async () => {
    setShowCompletionAnimation(false)
    if (isGoalCompleted) {
      await router.push('/goal-complete')
      router.refresh() // 强制刷新数据
    } else {
      await router.push('/dashboard')
      router.refresh() // 强制刷新数据
    }
  }

  /**
   * 【执行力强化】主界面：只显示 Action title + 完成标准
   * 不显示任何"已完成提示"或"历史状态"
   * 不显示导航栏（减少认知负担）
   * 显示目标上下文信息（增强用户对整体进度的感知）
   */
  return (
    <div className="min-h-screen p-4 bg-background">
      {/* 完成动画 */}
      {showCompletionAnimation && (
        <CompletionAnimation
          onComplete={handleAnimationComplete}
          isGoalCompleted={isGoalCompleted}
        />
      )}
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 【执行力强化】页面标题：使用指令性语言 */}
        <div className="text-center space-y-2 pt-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            今日唯一行动
          </h1>
          <p className="text-muted-foreground text-sm">
            每天只有一个必须完成的任务，但你可以用任何方式完成它
          </p>
        </div>

        {/* 上下文信息卡片：显示目标进度和激励信息 */}
        {goal && goalProgress && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-sm">
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {/* 目标名称 */}
                <div className="col-span-2 md:col-span-4">
                  <p className="text-sm text-muted-foreground mb-1">当前目标</p>
                  <p className="text-lg font-semibold">{goal.name || '未命名目标'}</p>
                </div>
                
                {/* 目标进度 */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">完成进度</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                        style={{ width: `${goalProgress.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                      {goalProgress.percentage}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {goalProgress.completed}/{goalProgress.total} 个行动
                  </p>
                </div>

                {/* 剩余行动数 */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">剩余行动</p>
                  <p className="text-2xl font-bold text-blue-600">{remainingActions}</p>
                  <p className="text-xs text-muted-foreground">个待完成</p>
                </div>

                {/* 连续完成天数 */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">连续完成</p>
                  <p className="text-2xl font-bold text-green-600">{consecutiveDays}</p>
                  <p className="text-xs text-muted-foreground">天</p>
                </div>

                {/* 查看复盘快捷入口 */}
                <div className="col-span-2 md:col-span-4 pt-2">
                  <Button
                    onClick={() => router.push('/dashboard')}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    查看复盘数据
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 【执行力强化】核心 Action 卡片：突出显示 */}
        <Card className="border-2 border-primary shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-1">
            <CardHeader className="pb-4 md:pb-6">
              <CardTitle className="text-2xl md:text-3xl text-center font-bold">{action.title || '未命名行动'}</CardTitle>
              <CardDescription className="text-center text-sm md:text-base mt-2">
                📝 完成标准（这是你今天的唯一任务，可以包含多个行为）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 md:space-y-8">
              {/* 【执行力强化】完成标准：突出显示，不可忽略 */}
              <div className="bg-gradient-to-br from-muted to-muted/50 p-5 md:p-6 rounded-xl border border-border/50">
                <p className="text-base md:text-lg leading-relaxed font-medium text-center whitespace-pre-line">
                  {action.definition || '完成标准未设置'}
                </p>
              </div>
              {action.definition && action.definition.length > 50 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  💡 完成标准可以包含多个行为，只要达到标准即可标记完成
                </p>
              )}

              {/* 【执行力强化】预计时间：仅作为信息，不参与决策 */}
              {action.estimated_time && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full">
                    <span>⏱️</span>
                    <span>预计时间：{action.estimated_time} 分钟</span>
                  </p>
                </div>
              )}

              {/* 专注计时器入口（从属于Action） */}
              {!showFocusTimer && (
                <div className="pt-2">
                  <Button
                    onClick={() => setShowFocusTimer(true)}
                    variant="outline"
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Timer className="w-4 h-4" />
                    开启专注计时（可选）
                  </Button>
                </div>
              )}

              {/* 专注计时器 */}
              {showFocusTimer && (
                <div className="pt-4">
                  <FocusTimer
                    actionId={action.id}
                    actionTitle={action.title}
                    defaultDuration={25}
                    onComplete={(durationMinutes) => {
                      setShowFocusTimer(false)
                      // 专注完成不等于Action完成，需要用户手动确认
                    }}
                    onCancel={() => setShowFocusTimer(false)}
                  />
                </div>
              )}

              {/* 【执行力强化】核心决策按钮：必须做出选择 */}
              <div className="flex gap-4 pt-4" role="group" aria-label="行动完成选项">
                <Button
                  onClick={handleComplete}
                  disabled={isSubmitting || isPending}
                  className="flex-1 h-14 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                  aria-label="标记行动为已完成"
                >
                  {isSubmitting || isPending ? '处理中...' : '✅ 完成'}
                </Button>
                <Button
                  onClick={handleIncomplete}
                  disabled={isSubmitting || isPending}
                  variant="outline"
                  className="flex-1 h-14 text-lg font-semibold border-2 hover:bg-muted transition-all"
                  size="lg"
                  aria-label="标记行动为未完成"
                >
                  {isSubmitting || isPending ? '处理中...' : '未完成'}
                </Button>
              </div>

              {/* 【执行力强化】提示：明确用户只有三个选择 */}
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                💡 请根据实际情况选择：已完成或未完成
              </p>
            </CardContent>
          </div>
        </Card>

        {/* 功能入口卡片：代办和专注空间 */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {/* 专注空间入口 */}
          <Card className="border-primary/20 hover:border-primary/40 hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Timer className="w-5 h-5 text-primary" />
                专注执行空间
              </CardTitle>
              <CardDescription className="text-sm">
                进入专注执行空间，处理今日任务或代办事项
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={() => router.push('/focus')}
                variant="outline"
                className="w-full gap-2"
              >
                <Timer className="w-4 h-4" />
                进入专注执行空间
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                💡 可以使用专注计时器，或直接标记完成
              </p>
            </CardContent>
          </Card>

          {/* 代办事项入口 */}
          <Card className="border-muted/50 hover:border-muted/80 hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-muted-foreground" />
                代办事项
              </CardTitle>
              <CardDescription className="text-sm">
                快速记录临时事项，7天后自动清理，不影响唯一任务进度
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <TodosList show={true} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 【执行力强化】完成弹窗：记录难度和精力（用于统计） */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md" role="dialog" aria-labelledby="completion-dialog-title" aria-describedby="completion-dialog-description">
          <DialogHeader>
            <DialogTitle id="completion-dialog-title" className="text-2xl">记录完成情况</DialogTitle>
            <DialogDescription id="completion-dialog-description" className="text-base">
              评估此次行动的难度和你的精力状态
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4" role="form" aria-label="完成情况反馈表单">
            <div className="space-y-3">
              <Label htmlFor="difficulty" className="text-base font-medium">难度 (1-5)</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="difficulty" className="h-11" aria-label="选择行动难度，范围1到5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - 非常简单</SelectItem>
                  <SelectItem value="2">2 - 简单</SelectItem>
                  <SelectItem value="3">3 - 中等</SelectItem>
                  <SelectItem value="4">4 - 困难</SelectItem>
                  <SelectItem value="5">5 - 非常困难</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label htmlFor="energy" className="text-base font-medium">精力 (1-5)</Label>
              <Select value={energy} onValueChange={setEnergy}>
                <SelectTrigger id="energy" className="h-11" aria-label="选择精力状态，范围1到5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - 非常疲惫</SelectItem>
                  <SelectItem value="2">2 - 疲惫</SelectItem>
                  <SelectItem value="3">3 - 一般</SelectItem>
                  <SelectItem value="4">4 - 充沛</SelectItem>
                  <SelectItem value="5">5 - 非常充沛</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)} 
              className="flex-1 sm:flex-initial"
              aria-label="取消完成操作"
            >
              取消
            </Button>
            <Button 
              onClick={handleSubmitCompletion} 
              disabled={isSubmitting || isPending}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              aria-label="确认完成行动"
            >
              {isSubmitting ? '提交中...' : isPending ? '加载中...' : '确认完成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
