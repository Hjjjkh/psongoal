'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Goal, Phase, Action } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { handleApiResponse } from '@/lib/utils'

/**
 * 【执行力强化】精简的 Props
 * 移除 execution：不关心"今天是否已记录"，所有判断交由后端处理
 */
interface TodayViewProps {
  goal: Goal | null
  phase: Phase | null
  action: Action | null
  hasCurrentAction: boolean  // 用于区分"无 action"和"系统异常"
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
export default function TodayView({ goal, phase, action, hasCurrentAction }: TodayViewProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [difficulty, setDifficulty] = useState<string>('3')
  const [energy, setEnergy] = useState<string>('3')
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * 【执行力强化】状态 2：current_action_id = null
   * 显示系统级提示，提供唯一出口按钮
   */
  if (!hasCurrentAction) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>当前目标已完成</CardTitle>
            <CardDescription>
              系统不允许继续执行，请设置新的目标
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/goals')} className="w-full" size="lg">
              进入规划页
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  /**
   * 【执行力强化】状态 1：有 current_action
   * 必须同时有 goal、phase、action 才能显示
   */
  if (!action || !goal || !phase) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">系统状态异常</p>
          <p className="text-muted-foreground">执行被暂停</p>
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
    if (!action) return

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

      const result = await handleApiResponse(response, '系统操作失败，请重试')

      if (result.success) {
        setIsDialogOpen(false)
        toast.success('行动已完成')
        router.refresh()
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
        toast.success('已标记为未完成')
        router.refresh()
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
   * 【执行力强化】主界面：只显示 Action title + 完成标准
   * 不显示任何"已完成提示"或"历史状态"
   * 不显示导航栏（减少认知负担）
   * 不显示目标/阶段信息（聚焦唯一行动）
   */
  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 【执行力强化】页面标题：使用指令性语言 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">当前唯一行动</h1>
          <p className="text-muted-foreground text-sm">
            必须完成此行动，系统不允许跳过
          </p>
        </div>

        {/* 【执行力强化】核心 Action 卡片：突出显示 */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{action.title}</CardTitle>
            <CardDescription className="text-center">完成标准</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 【执行力强化】完成标准：突出显示，不可忽略 */}
            <div className="bg-muted p-6 rounded-lg border-2">
              <p className="text-base leading-relaxed font-medium text-center">
                {action.definition}
              </p>
            </div>

            {/* 【执行力强化】预计时间：仅作为信息，不参与决策 */}
            {action.estimated_time && (
              <p className="text-sm text-muted-foreground text-center">
                预计时间：{action.estimated_time} 分钟
              </p>
            )}

            {/* 【执行力强化】核心决策按钮：必须做出选择 */}
            <div className="flex gap-4 pt-6">
              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="flex-1"
                size="lg"
              >
                完成
              </Button>
              <Button
                onClick={handleIncomplete}
                disabled={isSubmitting}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                未完成
              </Button>
            </div>

            {/* 【执行力强化】提示：明确用户只有三个选择 */}
            <p className="text-xs text-muted-foreground text-center">
              必须做出选择：完成 / 未完成 / 离开系统
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 【执行力强化】完成弹窗：记录难度和精力（用于统计） */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>记录完成情况</DialogTitle>
            <DialogDescription>
              评估此次行动的难度和你的精力状态
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">难度 (1-5)</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="difficulty">
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
            <div className="space-y-2">
              <Label htmlFor="energy">精力 (1-5)</Label>
              <Select value={energy} onValueChange={setEnergy}>
                <SelectTrigger id="energy">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmitCompletion} disabled={isSubmitting}>
              {isSubmitting ? '提交中...' : '确认完成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
