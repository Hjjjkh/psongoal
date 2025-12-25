'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Goal, Phase, Action } from '@/lib/types'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'

interface GoalWithDetails extends Goal {
  phases: (Phase & { actions: Action[] })[]
}

interface GoalsViewProps {
  goals: GoalWithDetails[]
}

export default function GoalsView({ goals: initialGoals }: GoalsViewProps) {
  const router = useRouter()
  const [goals, setGoals] = useState(initialGoals)
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())

  // Goal 创建对话框
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalCategory, setGoalCategory] = useState<'health' | 'learning' | 'project'>('health')
  const [goalStartDate, setGoalStartDate] = useState('')
  const [goalEndDate, setGoalEndDate] = useState('')
  const [isCreatingGoal, setIsCreatingGoal] = useState(false)

  // Phase 创建对话框
  const [isPhaseDialogOpen, setIsPhaseDialogOpen] = useState(false)
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [phaseName, setPhaseName] = useState('')
  const [phaseDescription, setPhaseDescription] = useState('')
  const [isCreatingPhase, setIsCreatingPhase] = useState(false)

  // Action 创建对话框
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)
  const [actionTitle, setActionTitle] = useState('')
  const [actionDefinition, setActionDefinition] = useState('')
  const [actionEstimatedTime, setActionEstimatedTime] = useState('')
  const [isCreatingAction, setIsCreatingAction] = useState(false)

  const handleCreateGoal = async () => {
    if (!goalName || !goalStartDate) return

    setIsCreatingGoal(true)
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: goalName,
          category: goalCategory,
          start_date: goalStartDate,
          end_date: goalEndDate || null,
        }),
      })

      if (response.ok) {
        router.refresh()
        setIsGoalDialogOpen(false)
        setGoalName('')
        setGoalCategory('health')
        setGoalStartDate('')
        setGoalEndDate('')
      } else {
        alert('创建失败，请重试')
      }
    } catch (error) {
      console.error('Error creating goal:', error)
      alert('创建失败，请重试')
    } finally {
      setIsCreatingGoal(false)
    }
  }

  const handleCreatePhase = async () => {
    if (!selectedGoalId || !phaseName) return

    setIsCreatingPhase(true)
    try {
      const response = await fetch('/api/phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: selectedGoalId,
          name: phaseName,
          description: phaseDescription || null,
        }),
      })

      if (response.ok) {
        router.refresh()
        setIsPhaseDialogOpen(false)
        setSelectedGoalId(null)
        setPhaseName('')
        setPhaseDescription('')
      } else {
        alert('创建失败，请重试')
      }
    } catch (error) {
      console.error('Error creating phase:', error)
      alert('创建失败，请重试')
    } finally {
      setIsCreatingPhase(false)
    }
  }

  const handleCreateAction = async () => {
    if (!selectedPhaseId || !actionTitle || !actionDefinition) return

    setIsCreatingAction(true)
    try {
      const response = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase_id: selectedPhaseId,
          title: actionTitle,
          definition: actionDefinition,
          estimated_time: actionEstimatedTime ? parseInt(actionEstimatedTime) : null,
        }),
      })

      if (response.ok) {
        router.refresh()
        setIsActionDialogOpen(false)
        setSelectedPhaseId(null)
        setActionTitle('')
        setActionDefinition('')
        setActionEstimatedTime('')
      } else {
        alert('创建失败，请重试')
      }
    } catch (error) {
      console.error('Error creating action:', error)
      alert('创建失败，请重试')
    } finally {
      setIsCreatingAction(false)
    }
  }

  const handleSetCurrentGoal = async (goalId: string) => {
    try {
      const response = await fetch('/api/set-current-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_id: goalId }),
      })

      if (response.ok) {
        router.push('/today')
      } else {
        alert('设置失败，请重试')
      }
    } catch (error) {
      console.error('Error setting current goal:', error)
      alert('设置失败，请重试')
    }
  }

  const toggleGoal = (goalId: string) => {
    const newSet = new Set(expandedGoals)
    if (newSet.has(goalId)) {
      newSet.delete(goalId)
    } else {
      newSet.add(goalId)
    }
    setExpandedGoals(newSet)
  }

  const togglePhase = (phaseId: string) => {
    const newSet = new Set(expandedPhases)
    if (newSet.has(phaseId)) {
      newSet.delete(phaseId)
    } else {
      newSet.add(phaseId)
    }
    setExpandedPhases(newSet)
  }

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">目标规划</h1>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.push('/today')}>
              今日
            </Button>
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              复盘
            </Button>
            <Button onClick={() => setIsGoalDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新建目标
            </Button>
          </div>
        </div>

        {goals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">还没有目标，创建一个开始吧</p>
              <Button onClick={() => setIsGoalDialogOpen(true)}>
                创建目标
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <Card key={goal.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        {expandedGoals.has(goal.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <CardTitle>{goal.name}</CardTitle>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {goal.category}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetCurrentGoal(goal.id)}
                    >
                      设为当前目标
                    </Button>
                  </div>
                  <CardDescription>
                    {goal.start_date} {goal.end_date && `- ${goal.end_date}`}
                  </CardDescription>
                </CardHeader>
                {expandedGoals.has(goal.id) && (
                  <CardContent className="space-y-4">
                    {goal.phases.length === 0 ? (
                      <p className="text-sm text-muted-foreground">还没有阶段</p>
                    ) : (
                      goal.phases.map((phase) => (
                        <div key={phase.id} className="border-l-2 pl-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => togglePhase(phase.id)}
                                className="p-1 hover:bg-muted rounded"
                              >
                                {expandedPhases.has(phase.id) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <h3 className="font-semibold">{phase.name}</h3>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPhaseId(phase.id)
                                setIsActionDialogOpen(true)
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              添加行动
                            </Button>
                          </div>
                          {phase.description && (
                            <p className="text-sm text-muted-foreground">{phase.description}</p>
                          )}
                          {expandedPhases.has(phase.id) && (
                            <div className="space-y-2 ml-6">
                              {phase.actions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">还没有行动</p>
                              ) : (
                                phase.actions.map((action) => (
                                  <div key={action.id} className="bg-muted p-3 rounded">
                                    <p className="font-medium text-sm">{action.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {action.definition}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedGoalId(goal.id)
                        setIsPhaseDialogOpen(true)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加阶段
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 创建 Goal 对话框 */}
      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建目标</DialogTitle>
            <DialogDescription>设置一个长期目标</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">目标名称</Label>
              <Input
                id="goal-name"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="例如：练出腹肌"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-category">类别</Label>
              <Select value={goalCategory} onValueChange={(v: any) => setGoalCategory(v)}>
                <SelectTrigger id="goal-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">健康</SelectItem>
                  <SelectItem value="learning">学习</SelectItem>
                  <SelectItem value="project">项目</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-start-date">开始日期</Label>
              <Input
                id="goal-start-date"
                type="date"
                value={goalStartDate}
                onChange={(e) => setGoalStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-end-date">结束日期（可选）</Label>
              <Input
                id="goal-end-date"
                type="date"
                value={goalEndDate}
                onChange={(e) => setGoalEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoalDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateGoal} disabled={isCreatingGoal}>
              {isCreatingGoal ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建 Phase 对话框 */}
      <Dialog open={isPhaseDialogOpen} onOpenChange={setIsPhaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建阶段</DialogTitle>
            <DialogDescription>为目标添加一个执行阶段</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phase-name">阶段名称</Label>
              <Input
                id="phase-name"
                value={phaseName}
                onChange={(e) => setPhaseName(e.target.value)}
                placeholder="例如：核心力量阶段"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phase-description">描述（可选）</Label>
              <Input
                id="phase-description"
                value={phaseDescription}
                onChange={(e) => setPhaseDescription(e.target.value)}
                placeholder="阶段说明"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPhaseDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreatePhase} disabled={isCreatingPhase}>
              {isCreatingPhase ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建 Action 对话框 */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建行动</DialogTitle>
            <DialogDescription>为阶段添加一个可执行的行动单元</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action-title">行动标题</Label>
              <Input
                id="action-title"
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                placeholder="例如：核心训练 Day 3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-definition">完成标准 *</Label>
              <Input
                id="action-definition"
                value={actionDefinition}
                onChange={(e) => setActionDefinition(e.target.value)}
                placeholder="必须是客观可判断的标准，例如：完成 3 组平板支撑，每组 60 秒"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-time">预计时间（分钟，可选）</Label>
              <Input
                id="action-time"
                type="number"
                value={actionEstimatedTime}
                onChange={(e) => setActionEstimatedTime(e.target.value)}
                placeholder="30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateAction} disabled={isCreatingAction}>
              {isCreatingAction ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

