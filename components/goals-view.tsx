'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { Goal, Phase, Action } from '@/lib/types'
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { handleApiResponse, getToday, getTomorrow, getThisWeekStart, getNextWeekStart, getRelativeDate, ensureEndDateAfterStart, renderSimpleMarkdown } from '@/lib/utils'
import { getTemplate, type TemplateCategory } from '@/lib/templates'

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
  
  // 模板创建状态
  const [useTemplate, setUseTemplate] = useState(false)
  const [templateActionCount, setTemplateActionCount] = useState('7')
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(true)
  const [categoryChanged, setCategoryChanged] = useState(false)
  // 模板行动编辑状态：存储每个模板行动的编辑内容
  const [templateActions, setTemplateActions] = useState<Record<number, { titleTemplate: string; definition: string; estimatedTime?: string }>>({})

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
  
  // 批量创建状态
  const [isBatchMode, setIsBatchMode] = useState(false)
  const [batchTitleTemplate, setBatchTitleTemplate] = useState('')
  const [batchCount, setBatchCount] = useState('')
  const [isCreatingBatch, setIsCreatingBatch] = useState(false)

  // 删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteType, setDeleteType] = useState<'goal' | 'phase' | 'action' | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState<string>('')

  // 从模板创建目标
  const handleCreateGoalFromTemplate = async () => {
    if (!goalName || !goalStartDate) return

    // 校验结束日期必填
    if (!goalEndDate) {
      toast.error('结束日期是必填项')
      return
    }

    const parsedCount = templateActionCount ? parseInt(templateActionCount) : NaN
    const actionCount = (!isNaN(parsedCount) && parsedCount >= 1 && parsedCount <= 100) ? parsedCount : 7
    if (actionCount < 1 || actionCount > 100) {
      toast.error('行动数量必须在 1-100 之间')
      return
    }

    setIsCreatingGoal(true)
    try {
      // 获取模板，准备编辑后的行动数据
      const template = getTemplate(goalCategory)
      const editedActions = template ? template.phase.exampleActions.map((action, idx) => {
        const edited = templateActions[idx]
        return edited ? {
          titleTemplate: edited.titleTemplate,
          definition: edited.definition,
          estimatedTime: edited.estimatedTime ? parseInt(edited.estimatedTime) : action.estimatedTime,
        } : action
      }) : null

      const response = await fetch('/api/goals/create-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: goalName,
          category: goalCategory,
          start_date: goalStartDate,
          end_date: goalEndDate,
          actionCount: actionCount,
          editedActions: editedActions, // 传递编辑后的行动数据
        }),
      })

      const result = await handleApiResponse<{ success: boolean; data?: { goal: any; phase: any; actions: any[]; actionCount: number } }>(response, '创建失败，请重试')

      if (result.success && result.data) {
        // API返回结构是 { success: true, data: { goal, phase, actions, actionCount } }
        // handleApiResponse 返回的 data 就是整个响应对象，需要访问 result.data.data
        const responseData = result.data.data
        // 明确获取数量：优先使用 actionCount，其次使用 actions.length，如果都没有则显示数据异常
        // 注意：避免与函数开头的 actionCount 变量名冲突，使用 createdActionCount
        const createdActionCount = responseData?.actionCount ?? responseData?.actions?.length
        
        if (createdActionCount !== undefined && createdActionCount !== null && createdActionCount > 0) {
          toast.success(`目标创建成功，已生成 ${createdActionCount} 个行动`, {
            description: '请点击"设为当前目标"开始执行',
            duration: 5000,
          })
        } else if (createdActionCount === 0) {
          toast.success('目标创建成功，但未生成行动', {
            description: '请先创建行动，然后点击"设为当前目标"',
            duration: 5000,
          })
        } else {
          toast.success('目标创建成功（行动数量数据异常）', {
            description: '请检查目标详情，然后点击"设为当前目标"',
            duration: 5000,
          })
        }
        router.refresh()
        setIsGoalDialogOpen(false)
        setGoalName('')
        setGoalCategory('health')
        setGoalStartDate('')
        setGoalEndDate('')
        setUseTemplate(false)
        setTemplateActionCount('7')
        setTemplateActions({}) // 清空编辑的模板行动
        
        // 模板创建会返回 phase，检查是否有 phase 和 actions
        const hasPhase = responseData?.phase !== undefined && responseData?.phase !== null
        const hasActions = createdActionCount !== undefined && createdActionCount !== null && createdActionCount > 0
        
        // 如果模板创建成功但没有生成行动，自动打开行动对话框
        if (hasPhase && !hasActions && responseData?.phase?.id) {
          setTimeout(() => {
            setSelectedPhaseId(responseData.phase.id)
            setIsActionDialogOpen(true)
          }, 100)
        }
      }
    } catch (error) {
      // handleApiResponse 已处理网络错误
    } finally {
      setIsCreatingGoal(false)
    }
  }

  const handleCreateGoal = async () => {
    if (!goalName || !goalStartDate) return
    
    // 校验结束日期必填
    if (!goalEndDate) {
      toast.error('结束日期是必填项')
      return
    }

    // 如果使用模板，调用模板创建接口
    if (useTemplate) {
      await handleCreateGoalFromTemplate()
      return
    }

    setIsCreatingGoal(true)
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: goalName,
          category: goalCategory,
          start_date: goalStartDate,
          end_date: goalEndDate,
        }),
      })

      const result = await handleApiResponse(response, '创建失败，请重试')

      if (result.success && result.data) {
        toast.success('目标创建成功', {
          description: '请先创建阶段和行动，然后点击"设为当前目标"开始执行',
          duration: 5000,
        })
        
        // 手动创建的目标没有阶段，自动展开阶段对话框
        // API 返回的数据结构是 { success: true, data: { id, name, ... } }
        const goalId = (result.data as any)?.id
        
        router.refresh()
        setIsGoalDialogOpen(false)
        setGoalName('')
        setGoalCategory('health')
        setGoalStartDate('')
        setGoalEndDate('')
        setUseTemplate(false)
        setTemplateActionCount('7')
        
        // 等待页面刷新后，自动打开阶段对话框
        if (goalId) {
          setTimeout(() => {
            setSelectedGoalId(goalId)
            setIsPhaseDialogOpen(true)
          }, 100)
        }
      }
      // handleApiResponse 已处理错误提示
    } catch (error) {
      // handleApiResponse 已处理网络错误
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

      const result = await handleApiResponse<{ id: string; goal_id: string; name: string; description: string | null; order_index: number }>(response, '创建失败，请重试')

      if (result.success) {
        toast.success('阶段创建成功')
        
        // 保存新创建的阶段ID，用于后续打开行动对话框
        const newPhaseId = result.data?.id
        
        router.refresh()
        setIsPhaseDialogOpen(false)
        
        // 检查目标是否有行动，如果没有，自动打开行动对话框
        const goal = goals.find(g => g.id === selectedGoalId)
        const hasActions = goal?.phases?.some(p => p.actions && p.actions.length > 0) ?? false
        
        if (!hasActions && newPhaseId) {
          // 等待页面刷新后，自动打开行动对话框
          setTimeout(() => {
            setSelectedPhaseId(newPhaseId)
            setIsActionDialogOpen(true)
          }, 100)
        }
        
        setSelectedGoalId(null)
        setPhaseName('')
        setPhaseDescription('')
      }
      // handleApiResponse 已处理错误提示
    } catch (error) {
      // handleApiResponse 已处理网络错误
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

      const result = await handleApiResponse(response, '创建失败，请重试')

      if (result.success) {
        toast.success('行动创建成功')
        router.refresh()
        setIsActionDialogOpen(false)
        setSelectedPhaseId(null)
        setActionTitle('')
        setActionDefinition('')
        setActionEstimatedTime('')
        setIsBatchMode(false)
      }
      // handleApiResponse 已处理错误提示
    } catch (error) {
      // handleApiResponse 已处理网络错误
    } finally {
      setIsCreatingAction(false)
    }
  }

  // 批量创建行动
  const handleBatchCreateActions = async () => {
    if (!selectedPhaseId || !batchTitleTemplate || !actionDefinition || !batchCount) return

    const count = parseInt(batchCount)
    if (isNaN(count) || count < 1 || count > 1000) {
      toast.error('数量必须在 1-1000 之间')
      return
    }

    setIsCreatingBatch(true)
    try {
      const response = await fetch('/api/actions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase_id: selectedPhaseId,
          title_template: batchTitleTemplate,
          definition: actionDefinition,
          count: count,
          estimated_time: actionEstimatedTime ? parseInt(actionEstimatedTime) : null,
        }),
      })

      const result = await handleApiResponse<{ success: boolean; data?: { count: number; actions: any[] } }>(response, '批量创建失败，请重试')

      if (result.success && result.data) {
        // API返回结构是 { success: true, data: { count, actions } }
        // handleApiResponse 返回的 data 就是整个响应对象，需要访问 result.data.data
        const responseData = result.data.data
        // 明确获取数量：优先使用 count，其次使用 actions.length，禁止使用用户输入作为兜底
        const createdCount = responseData?.count ?? responseData?.actions?.length
        
        if (createdCount !== undefined && createdCount !== null && createdCount > 0) {
          toast.success(`成功创建 ${createdCount} 个行动`)
        } else if (createdCount === 0) {
          toast.success('批量创建成功，但未创建任何行动')
        } else {
          toast.success('批量创建成功（创建数量数据异常）')
        }
        router.refresh()
        setIsActionDialogOpen(false)
        setSelectedPhaseId(null)
        setActionTitle('')
        setActionDefinition('')
        setActionEstimatedTime('')
        setBatchTitleTemplate('')
        setBatchCount('')
        setIsBatchMode(false)
      }
      // handleApiResponse 已处理错误提示
    } catch (error) {
      // handleApiResponse 已处理网络错误
    } finally {
      setIsCreatingBatch(false)
    }
  }

  const handleSetCurrentGoal = async (goalId: string) => {
    try {
      const response = await fetch('/api/set-current-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_id: goalId }),
      })

      const result = await handleApiResponse(response, '设置失败，请重试')

      if (result.success) {
        toast.success('当前目标已设置')
        // 设置成功后，直接跳转到 today 页面
        // today 页面会根据"每日唯一行动"逻辑自动判断今天是否已完成
        router.push('/today')
      }
      // handleApiResponse 已处理错误提示
    } catch (error) {
      // handleApiResponse 已处理网络错误
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

  // DEV ONLY: 删除功能（测试级删除）
  const isDev = process.env.NODE_ENV === 'development'

  const handleDeleteGoal = async (goalId: string) => {
    if (!isDev) return
    
    const goal = goals.find(g => g.id === goalId)
    if (goal) {
      setDeleteType('goal')
      setDeleteId(goalId)
      setDeleteName(goal.name || '未命名目标')
      setDeleteConfirmOpen(true)
    }
  }

  const handleDeletePhase = async (phaseId: string) => {
    if (!isDev) return
    
    // 查找阶段名称
    let phaseName = '未命名阶段'
    for (const goal of goals) {
      const phase = goal.phases.find(p => p.id === phaseId)
      if (phase) {
        phaseName = phase.name || '未命名阶段'
        break
      }
    }
    
    setDeleteType('phase')
    setDeleteId(phaseId)
    setDeleteName(phaseName)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteAction = async (actionId: string) => {
    if (!isDev) return
    
    // 查找行动名称
    let actionName = '未命名行动'
    for (const goal of goals) {
      for (const phase of goal.phases) {
        const action = phase.actions.find(a => a.id === actionId)
        if (action) {
          actionName = action.title || '未命名行动'
          break
        }
      }
    }
    
    setDeleteType('action')
    setDeleteId(actionId)
    setDeleteName(actionName)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteId || !deleteType) return

    try {
      let endpoint = ''
      let successMessage = ''
      
      if (deleteType === 'goal') {
        endpoint = `/api/goals/${deleteId}`
        successMessage = '目标已删除'
      } else if (deleteType === 'phase') {
        endpoint = `/api/phases/${deleteId}`
        successMessage = '阶段已删除'
      } else if (deleteType === 'action') {
        endpoint = `/api/actions/${deleteId}`
        successMessage = '行动已删除'
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
      })

      const result = await handleApiResponse(response, '删除失败')
      if (result.success) {
        toast.success(successMessage)
        router.refresh()
      }
    } catch (error) {
      // handleApiResponse 已处理错误
    } finally {
      setDeleteConfirmOpen(false)
      setDeleteType(null)
      setDeleteId(null)
      setDeleteName('')
    }
  }

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">目标规划</h1>
          <Button onClick={() => setIsGoalDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新建目标
          </Button>
        </div>

        {goals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <div className="space-y-2">
                <p className="text-lg font-semibold">还没有目标，创建一个开始吧</p>
                <p className="text-sm text-muted-foreground">
                  建议使用模板快速创建，系统会自动生成阶段和示例行动
                </p>
              </div>
              <Button onClick={() => setIsGoalDialogOpen(true)} size="lg">
                创建目标
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                💡 提示：创建目标时勾选&ldquo;使用模板&rdquo;，可以快速开始
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <Card key={goal.id} className="hover:shadow-lg transition-shadow duration-200 rounded-xl overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                      >
                        {expandedGoals.has(goal.id) ? (
                          <ChevronDown className="w-5 h-5 transition-transform" />
                        ) : (
                          <ChevronRight className="w-5 h-5 transition-transform" />
                        )}
                      </button>
                      <CardTitle className="text-xl truncate">{goal.name || '未命名目标'}</CardTitle>
                      <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full flex-shrink-0">
                        {goal.category === 'health' ? '健康' : goal.category === 'learning' ? '学习' : goal.category === 'project' ? '项目' : '未分类'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetCurrentGoal(goal.id)}
                        disabled={goal.status === 'completed'}
                        title={goal.status === 'completed' ? '已完成的目标无法设为当前目标' : ''}
                      >
                        设为当前目标
                      </Button>
                      {isDev && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {goal.start_date || '开始日期未设置'} {goal.end_date ? `- ${goal.end_date}` : ''}
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
                              <h3 className="font-semibold">{phase.name || '未命名阶段'}</h3>
                            </div>
                            <div className="flex gap-2">
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
                              {isDev && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeletePhase(phase.id)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
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
                                  <div key={action.id} className="bg-muted p-3 rounded flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium text-sm">{action.title || '未命名行动'}</p>
                                        {action.completed_at && (
                                          <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">
                                            已完成
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {action.definition || '完成标准未设置'}
                                      </p>
                                    </div>
                                    {isDev && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteAction(action.id)}
                                        className="text-muted-foreground hover:text-destructive shrink-0"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
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
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>创建目标</DialogTitle>
            <DialogDescription>设置一个长期目标</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0">
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
              <Select 
                value={goalCategory} 
                onValueChange={(v: 'health' | 'learning' | 'project') => {
                  setGoalCategory(v)
                  // 切换模板时重置数量为默认值，并显示高亮动画
                  setTemplateActionCount('7')
                  setIsPreviewExpanded(true)
                  setCategoryChanged(true)
                  setTimeout(() => setCategoryChanged(false), 1000)
                  // 切换类别时清空编辑的模板行动
                  setTemplateActions({})
                  // 如果使用模板，用默认日期初始化（如果还未设置）
                  if (useTemplate && !goalStartDate) {
                    setGoalStartDate(getToday())
                  }
                  if (useTemplate && !goalEndDate) {
                    // 默认结束日期为开始日期后30天，如果开始日期已设置则基于开始日期
                    const baseDate = goalStartDate || getToday()
                    setGoalEndDate(getRelativeDate(30, baseDate))
                  }
                }}
              >
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
            
            {/* 模板化创建选项 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="use-template"
                  checked={useTemplate}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setUseTemplate(checked)
                    if (checked) {
                      setIsPreviewExpanded(true)
                      // 使用模板时，用默认值初始化字段（如果还未设置）
                      if (!goalStartDate) {
                        setGoalStartDate(getToday())
                      }
                      if (!goalEndDate) {
                        // 默认结束日期为开始日期后30天，如果开始日期已设置则基于开始日期
                        const baseDate = goalStartDate || getToday()
                        setGoalEndDate(getRelativeDate(30, baseDate))
                      }
                    }
                  }}
                  className="rounded"
                />
                <Label htmlFor="use-template" className="cursor-pointer">
                  使用模板快速创建（自动生成阶段和示例行动，所有字段可修改）
                </Label>
              </div>
              {useTemplate && (
                <div className={`ml-6 space-y-3 p-3 bg-muted rounded transition-all duration-500 ${
                  categoryChanged ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}>
                  {/* 提示：模板字段可修改 */}
                  <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded">
                    💡 提示：模板提供默认值，你可以修改任何字段（目标名称、日期、行动数量等）
                  </div>
                  {/* 模板信息预览 - 可折叠 */}
                  {(() => {
                    const template = getTemplate(goalCategory)
                    if (!template) return <div className="text-sm text-muted-foreground">模板加载中...</div>
                    
                    // 明确获取数量：如果 templateActionCount 无效，显示"未设置"
                    const parsedCount = templateActionCount ? parseInt(templateActionCount) : null
                    const count = parsedCount && parsedCount >= 1 && parsedCount <= 100 ? parsedCount : null
                    const totalActions = count !== null && template.phase.exampleActions.length > 0
                      ? template.phase.exampleActions.length * count
                      : null
                    const isLargeCount = count !== null && count > 50
                    
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium mb-1">
                              模板：{template.phase.name}
                            </div>
                            {template.phase.description && (
                              <div 
                                className="text-xs text-muted-foreground"
                                dangerouslySetInnerHTML={{ 
                                  __html: renderSimpleMarkdown(template.phase.description) 
                                }}
                              />
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                            className="h-6 px-2 text-xs"
                          >
                            {isPreviewExpanded ? '收起' : '展开'}
                          </Button>
                        </div>
                        
                        {/* 模板行动编辑 - 可折叠 */}
                        {isPreviewExpanded && (
                          <div className="space-y-3">
                            <div className="text-xs font-medium">模板行动（可编辑）：</div>
                            <div className="space-y-3">
                              {template.phase.exampleActions.map((exampleAction, idx) => {
                                const editedAction = templateActions[idx] || {
                                  titleTemplate: exampleAction.titleTemplate,
                                  definition: exampleAction.definition,
                                  estimatedTime: exampleAction.estimatedTime?.toString() || ''
                                }
                                const previewTitle = editedAction.titleTemplate.replace(/{n}/g, '1')
                                return (
                                  <div key={idx} className="text-xs bg-background p-3 rounded border space-y-2">
                                    <div>
                                      <Label className="text-xs">标题模板（使用 {`{n}`} 表示序号）</Label>
                                      <Input
                                        value={editedAction.titleTemplate}
                                        onChange={(e) => {
                                          setTemplateActions({
                                            ...templateActions,
                                            [idx]: { ...editedAction, titleTemplate: e.target.value }
                                          })
                                        }}
                                        className="h-7 text-xs mt-1"
                                        placeholder="例如：核心训练 Day {n}"
                                      />
                                      <div className="text-[10px] text-muted-foreground mt-0.5">
                                        预览：{previewTitle} {count !== null ? `(将生成 ${count} 个)` : '(数量未设置)'}
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-xs">完成标准</Label>
                                      <Textarea
                                        value={editedAction.definition}
                                        onChange={(e) => {
                                          setTemplateActions({
                                            ...templateActions,
                                            [idx]: { ...editedAction, definition: e.target.value }
                                          })
                                        }}
                                        className="h-16 text-xs mt-1 resize-none"
                                        placeholder="例如：完成3组，每组10次"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">预计时间（分钟，可选）</Label>
                                      <Input
                                        type="number"
                                        value={editedAction.estimatedTime}
                                        onChange={(e) => {
                                          setTemplateActions({
                                            ...templateActions,
                                            [idx]: { ...editedAction, estimatedTime: e.target.value }
                                          })
                                        }}
                                        className="h-7 text-xs mt-1"
                                        placeholder="例如：30"
                                        min="0"
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* 批量生成数量控制 */}
                        <div className="space-y-2 pt-2 border-t">
                          <Label htmlFor="template-action-count" className="text-xs">
                            每个示例行动生成数量（默认 7 个，范围 1-100）
                          </Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              id="template-action-count"
                              type="number"
                              value={templateActionCount}
                              onChange={(e) => {
                                const val = e.target.value
                                // 限制范围
                                if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 100)) {
                                  setTemplateActionCount(val)
                                }
                              }}
                              min="1"
                              max="100"
                              className={`h-8 text-xs flex-1 ${
                                isLargeCount ? 'border-yellow-500' : ''
                              }`}
                            />
                            {/* 快速选择常用数量 */}
                            <div className="flex gap-1">
                              {[7, 10, 15].map((quickCount) => (
                                <Button
                                  key={quickCount}
                                  type="button"
                                  variant={templateActionCount === quickCount.toString() ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setTemplateActionCount(quickCount.toString())}
                                  className="h-8 px-2 text-xs"
                                >
                                  {quickCount}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              总计：{totalActions !== null ? (
                                <span className="font-medium">{totalActions}</span>
                              ) : (
                                <span className="font-medium">未设置</span>
                              )} 个行动
                            </div>
                            {isLargeCount && (
                              <div className="text-xs text-yellow-600 flex items-center gap-1">
                                <span>⚠️</span>
                                <span>数量过多可能延迟生成</span>
                              </div>
                            )}
                          </div>
                          {count !== null && count > 0 && (
                            <p className={`text-xs ${
                              isLargeCount ? 'text-yellow-600' : 'text-muted-foreground'
                            }`}>
                              {isLargeCount 
                                ? '提示：数量过多可能导致创建时间较长，建议不超过 50' 
                                : '提示：数量过多可能导致创建时间较长，建议不超过 50'}
                            </p>
                          )}
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-start-date">开始日期</Label>
              <div className="flex gap-2">
                <Input
                  id="goal-start-date"
                  type="date"
                  value={goalStartDate}
                  onChange={(e) => setGoalStartDate(e.target.value)}
                  className="flex-1"
                />
                {/* 日期快捷选择 */}
                <div className="flex gap-1 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newStartDate = getToday()
                      setGoalStartDate(newStartDate)
                      // 如果结束日期早于新的开始日期，自动调整
                      if (goalEndDate && goalEndDate < newStartDate) {
                        setGoalEndDate(newStartDate)
                      }
                    }}
                    className="text-xs min-w-[50px]"
                  >
                    今天
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newStartDate = getTomorrow()
                      setGoalStartDate(newStartDate)
                      if (goalEndDate && goalEndDate < newStartDate) {
                        setGoalEndDate(newStartDate)
                      }
                    }}
                    className="text-xs min-w-[50px]"
                  >
                    明天
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newStartDate = getThisWeekStart()
                      setGoalStartDate(newStartDate)
                      if (goalEndDate && goalEndDate < newStartDate) {
                        setGoalEndDate(newStartDate)
                      }
                    }}
                    className="text-xs min-w-[50px]"
                  >
                    本周
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newStartDate = getNextWeekStart()
                      setGoalStartDate(newStartDate)
                      if (goalEndDate && goalEndDate < newStartDate) {
                        setGoalEndDate(newStartDate)
                      }
                    }}
                    className="text-xs min-w-[50px]"
                  >
                    下周
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-end-date">结束日期 *</Label>
              <div className="flex gap-2">
                <Input
                  id="goal-end-date"
                  type="date"
                  value={goalEndDate}
                  onChange={(e) => {
                    const newEndDate = e.target.value
                    // 确保结束日期 >= 开始日期
                    const adjustedEndDate = goalStartDate
                      ? ensureEndDateAfterStart(goalStartDate, newEndDate)
                      : newEndDate
                    setGoalEndDate(adjustedEndDate)
                    // 如果自动调整了，给用户低摩擦提示
                    if (adjustedEndDate !== newEndDate && goalStartDate) {
                      toast.warning('结束日期已自动调整为不早于开始日期', { duration: 2000 })
                    }
                  }}
                  min={goalStartDate || undefined}
                  className="flex-1"
                />
                {/* 日期快捷选择 */}
                <div className="flex gap-1 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newEndDate = getRelativeDate(7)
                      const adjustedEndDate = goalStartDate
                        ? ensureEndDateAfterStart(goalStartDate, newEndDate)
                        : newEndDate
                      setGoalEndDate(adjustedEndDate)
                    }}
                    className="text-xs min-w-[50px]"
                  >
                    7天后
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newEndDate = getRelativeDate(30)
                      const adjustedEndDate = goalStartDate
                        ? ensureEndDateAfterStart(goalStartDate, newEndDate)
                        : newEndDate
                      setGoalEndDate(adjustedEndDate)
                    }}
                    className="text-xs min-w-[50px]"
                  >
                    30天后
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newEndDate = getRelativeDate(90)
                      const adjustedEndDate = goalStartDate
                        ? ensureEndDateAfterStart(goalStartDate, newEndDate)
                        : newEndDate
                      setGoalEndDate(adjustedEndDate)
                    }}
                    className="text-xs min-w-[50px]"
                  >
                    90天后
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-3">
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
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>创建阶段</DialogTitle>
            <DialogDescription>为目标添加一个执行阶段</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0">
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
          <DialogFooter className="flex-shrink-0 border-t pt-3">
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
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>创建行动</DialogTitle>
            <DialogDescription>为阶段添加一个可执行的行动单元</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0">
            {/* 批量创建模式切换 */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={isBatchMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsBatchMode(!isBatchMode)}
              >
                {isBatchMode ? '批量创建' : '单个创建'}
              </Button>
              {isBatchMode && (
                <span className="text-xs text-muted-foreground">
                  一次创建多个序列化任务
                </span>
              )}
            </div>

            {isBatchMode ? (
              /* 批量创建表单 */
              <>
                <div className="space-y-2">
                  <Label htmlFor="batch-title-template">标题模板 *</Label>
                  <Input
                    id="batch-title-template"
                    value={batchTitleTemplate}
                    onChange={(e) => setBatchTitleTemplate(e.target.value)}
                    placeholder="例如：核心训练 Day {n} 或 {date} 的训练"
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      支持的占位符：
                    </p>
                    <div className="text-xs text-muted-foreground space-y-0.5 pl-2">
                      <div>• {"{n}"} - 序号（1, 2, 3...）</div>
                      <div>• {"{date}"} - 当前日期（YYYY-MM-DD）</div>
                      <div>• {"{date+N}"} - 日期加N天（如 {"{date+7}"} 表示7天后）</div>
                      <div>• {"{week}"} - 当前周数</div>
                      <div>• {"{userName}"} - 用户名</div>
                      <div>• {"{year}"}, {"{month}"}, {"{day}"} - 年月日</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-count">数量 *</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="batch-count"
                      type="number"
                      value={batchCount}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 1000)) {
                          setBatchCount(val)
                        }
                      }}
                      placeholder="例如：30"
                      min="1"
                      max="1000"
                      className={`flex-1 ${
                        batchCount && !isNaN(parseInt(batchCount)) && parseInt(batchCount) > 100 ? 'border-yellow-500' : ''
                      }`}
                    />
                    {/* 快速选择常用数量 */}
                    <div className="flex gap-1">
                      {[7, 10, 15, 30].map((quickCount) => (
                        <Button
                          key={quickCount}
                          type="button"
                          variant={batchCount === quickCount.toString() ? "default" : "outline"}
                          size="sm"
                          onClick={() => setBatchCount(quickCount.toString())}
                          className="h-8 px-2 text-xs"
                        >
                          {quickCount}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      将创建 1 到 {batchCount || 'N'} 个行动
                    </p>
                    {batchCount && !isNaN(parseInt(batchCount)) && parseInt(batchCount) > 100 && (
                      <div className="text-xs text-yellow-600 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>数量过多可能延迟生成</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="action-definition-batch">完成标准 *</Label>
                  <Input
                    id="action-definition-batch"
                    value={actionDefinition}
                    onChange={(e) => setActionDefinition(e.target.value)}
                    placeholder="必须是客观可判断的标准，例如：完成 3 组平板支撑，每组 60 秒"
                  />
                  <p className="text-xs text-muted-foreground">
                    所有行动将共用此完成标准（支持占位符，如 {"{date}"}、{"{userName}"} 等）
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="action-time-batch">预计时间（分钟，可选）</Label>
                  <Input
                    id="action-time-batch"
                    type="number"
                    value={actionEstimatedTime}
                    onChange={(e) => setActionEstimatedTime(e.target.value)}
                    placeholder="30"
                  />
                </div>
              </>
            ) : (
              /* 单个创建表单 */
              <>
                <div className="space-y-2">
                  <Label htmlFor="action-title">行动标题 *</Label>
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
              </>
            )}
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-3">
            <Button variant="outline" onClick={() => {
              setIsActionDialogOpen(false)
              setIsBatchMode(false)
              setBatchTitleTemplate('')
              setBatchCount('')
            }}>
              取消
            </Button>
            {isBatchMode ? (
              <Button onClick={handleBatchCreateActions} disabled={isCreatingBatch}>
                {isCreatingBatch ? '创建中...' : `批量创建`}
              </Button>
            ) : (
              <Button onClick={handleCreateAction} disabled={isCreatingAction}>
                {isCreatingAction ? '创建中...' : '创建'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除{deleteType === 'goal' ? '目标' : deleteType === 'phase' ? '阶段' : '行动'} &ldquo;{deleteName}&rdquo; 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

