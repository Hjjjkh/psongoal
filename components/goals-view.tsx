'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import type { Goal, Phase, Action } from '@/lib/types'
import { Plus, ChevronDown, ChevronRight, Trash2, ChevronUp, GripVertical, Pause, Play, CheckSquare, Square } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { handleApiResponse, getToday, getTomorrow, getThisWeekStart, getNextWeekStart, getRelativeDate, ensureEndDateAfterStart, renderSimpleMarkdown } from '@/lib/utils'
// 已废弃：不再使用内置模板，统一使用模板库
// import { getTemplate, type TemplateCategory } from '@/lib/templates'
import dynamic from 'next/dynamic'
import OnboardingGuide from '@/components/onboarding-guide'

// 动态导入大型组件，减少初始加载时间
const ActionTemplateSelector = dynamic(() => import('@/components/action-template-selector'), {
  loading: () => <div className="flex items-center justify-center p-4">加载中...</div>,
  ssr: false,
})

const GoalTemplateSelector = dynamic(() => import('@/components/goal-template-selector'), {
  loading: () => <div className="flex items-center justify-center p-4">加载中...</div>,
  ssr: false,
})

const TemplateEditor = dynamic(() => import('@/components/template-editor'), {
  loading: () => <div className="flex items-center justify-center p-4">加载中...</div>,
  ssr: false,
})

interface GoalWithDetails extends Goal {
  phases: (Phase & { actions: Action[] })[]
}

interface GoalsViewProps {
  goals: GoalWithDetails[]
}

// 可拖拽的阶段组件
function SortablePhaseItem({
  phase,
  goalId,
  isPhaseSelected,
  isPhaseExpanded,
  isBatchSelectMode,
  onTogglePhase,
  onTogglePhaseSelection,
  onAddAction,
  onDeletePhase,
  onDragEnd,
}: {
  phase: Phase & { actions: Action[] }
  goalId: string
  isPhaseSelected: boolean
  isPhaseExpanded: boolean
  isBatchSelectMode: boolean
  onTogglePhase: (id: string) => void
  onTogglePhaseSelection: (id: string) => void
  onAddAction: () => void
  onDeletePhase: (id: string) => void
  onDragEnd: (event: DragEndEvent, goalId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-l-2 pl-4 space-y-2 ${isPhaseSelected ? 'bg-primary/5 rounded-lg p-2' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isBatchSelectMode && (
            <Checkbox
              checked={isPhaseSelected}
              onCheckedChange={() => onTogglePhaseSelection(phase.id)}
              className="flex-shrink-0"
              aria-label="选择阶段"
            />
          )}
          <button
            onClick={() => onTogglePhase(phase.id)}
            className="p-1 hover:bg-muted rounded"
            disabled={isBatchSelectMode}
          >
            {isPhaseExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <div className="flex items-center gap-2 flex-1">
            <GripVertical
              className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            />
            <h3 className="font-semibold">{phase.name || '未命名阶段'}</h3>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onAddAction}
            disabled={isBatchSelectMode}
          >
            <Plus className="w-4 h-4 mr-1" />
            添加行动
          </Button>
          {!isBatchSelectMode && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDeletePhase(phase.id)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="删除阶段"
              title="删除阶段"
            >
              <Trash2 className="w-3 h-3" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// 可拖拽的行动组件
function SortableActionItem({
  action,
  phaseId,
  isActionSelected,
  isBatchSelectMode,
  onToggleActionSelection,
  onDeleteAction,
  onDragEnd,
}: {
  action: Action
  phaseId: string
  isActionSelected: boolean
  isBatchSelectMode: boolean
  onToggleActionSelection: (id: string) => void
  onDeleteAction: (id: string) => void
  onDragEnd: (event: DragEndEvent, phaseId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: action.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-muted p-3 rounded flex items-start justify-between gap-2 ${isActionSelected ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center gap-2 flex-1">
        {isBatchSelectMode && (
            <Checkbox
              checked={isActionSelected}
              onCheckedChange={() => onToggleActionSelection(action.id)}
              className="flex-shrink-0"
              aria-label="选择行动"
            />
          )}
        <GripVertical
          className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0"
          {...attributes}
          {...listeners}
        />
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
      </div>
      {!isBatchSelectMode && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDeleteAction(action.id)}
          className="text-muted-foreground hover:text-destructive shrink-0"
          aria-label="删除行动"
          title="删除行动"
        >
          <Trash2 className="w-3 h-3" aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}

export default function GoalsView({ goals: initialGoals }: GoalsViewProps) {
  const router = useRouter()
  const [goals, setGoals] = useState(initialGoals)
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  
  // 排序操作状态管理（防止并发请求）
  const [isReorderingPhases, setIsReorderingPhases] = useState(false)
  const [isReorderingActions, setIsReorderingActions] = useState(false)
  // 【优化】分离防抖定时器，避免阶段和行动排序互相干扰
  const phaseReorderTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const actionReorderTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 清理防抖定时器（组件卸载时）
  useEffect(() => {
    return () => {
      if (phaseReorderTimeoutRef.current) {
        clearTimeout(phaseReorderTimeoutRef.current)
      }
      if (actionReorderTimeoutRef.current) {
        clearTimeout(actionReorderTimeoutRef.current)
      }
    }
  }, [])

  // Goal 创建对话框
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalCategory, setGoalCategory] = useState<'health' | 'learning' | 'project' | 'custom'>('health')
  const [customCategoryName, setCustomCategoryName] = useState('') // 自定义分类名称
  const [goalStartDate, setGoalStartDate] = useState('')
  const [goalEndDate, setGoalEndDate] = useState('')
  const [isCreatingGoal, setIsCreatingGoal] = useState(false)
  
  // 模板创建状态（统一使用模板库）
  const [useTemplateLibrary, setUseTemplateLibrary] = useState(false) // 是否从模板库选择
  const [selectedGoalTemplate, setSelectedGoalTemplate] = useState<any>(null) // 选中的目标模板
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(true)
  // 模板行动编辑状态：存储每个模板行动的编辑内容（已废弃，保留用于兼容）
  const [templateActions, setTemplateActions] = useState<Record<number, { titleTemplate: string; definition: string; estimatedTime?: string }>>({})
  
  // 新增：目标模板编辑状态（支持多阶段）
  interface TemplatePhaseEdit {
    name: string
    description: string
    actions: Array<{ title_template: string; definition: string; estimated_time: string; count?: string }>
  }
  const [templatePhases, setTemplatePhases] = useState<TemplatePhaseEdit[]>([])
  
  // 检查是否有快速创建请求
  useEffect(() => {
    const quickCreateTemplate = sessionStorage.getItem('quickCreateTemplate')
    if (quickCreateTemplate) {
      try {
        const template = JSON.parse(quickCreateTemplate)
        // 设置模板相关状态
        setUseTemplateLibrary(true)
        setSelectedGoalTemplate(template)
        setGoalCategory(template.category || 'health')
        
        // 如果模板有自定义分类名称，从描述中提取
        if (template.category === 'custom' && template.description) {
          const match = template.description.match(/\[分类:\s*([^\]]+)\]/)
          if (match && match[1]) {
            setCustomCategoryName(match[1].trim())
          } else {
            setCustomCategoryName('')
          }
        } else {
          setCustomCategoryName('')
        }
        
        // 将模板转换为可编辑格式
        const templateWithPhases = template as any
        let phasesToSet: TemplatePhaseEdit[] = []
        
        if (templateWithPhases.phases && Array.isArray(templateWithPhases.phases) && templateWithPhases.phases.length > 0) {
          phasesToSet = templateWithPhases.phases.map((phase: any) => ({
            name: phase.name || '',
            description: phase.description || '',
            actions: (phase.actions || []).map((action: any) => ({
              title_template: action.title_template || '',
              definition: action.definition || '',
              estimated_time: action.estimated_time?.toString() || '',
              count: action.count?.toString() || '7',
            })),
          }))
        } else {
          phasesToSet = [{
            name: template.phase_name || '',
            description: template.phase_description || '',
            actions: (template.actions || []).map((action: any) => ({
              title_template: action.title_template || '',
              definition: action.definition || '',
              estimated_time: action.estimated_time?.toString() || '',
              count: action.count?.toString() || '7',
            })),
          }]
        }
        
        setTemplatePhases(phasesToSet)
        
        // 打开创建对话框
        setIsGoalDialogOpen(true)
        
        // 清除 sessionStorage
        sessionStorage.removeItem('quickCreateTemplate')
        
        // 清除URL参数
        router.replace('/goals', { scroll: false })
      } catch (error) {
        console.error('Failed to parse quick create template:', error)
        sessionStorage.removeItem('quickCreateTemplate')
      }
    }
  }, [router])

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
  
  // 批量操作状态（删除等）
  const [isBatchSelectMode, setIsBatchSelectMode] = useState(false)
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set())
  const [selectedPhases, setSelectedPhases] = useState<Set<string>>(new Set())
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set())
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)

  // 拖拽排序传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const [batchTitleTemplate, setBatchTitleTemplate] = useState('')
  const [batchCount, setBatchCount] = useState('')
  const [isCreatingBatch, setIsCreatingBatch] = useState(false)

  // 行动模板选择状态
  const [useActionTemplate, setUseActionTemplate] = useState(false)

  // 删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteType, setDeleteType] = useState<'goal' | 'phase' | 'action' | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState<string>('')

  // 批量创建确认对话框状态
  const [showBatchConfirmDialog, setShowBatchConfirmDialog] = useState(false)

  // 新用户引导状态
  // 初始状态必须与服务器端一致，避免水合错误
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  // 在客户端安全地检查是否显示引导
  // 使用 isClient 确保只在客户端执行，避免水合错误
  useEffect(() => {
    setIsClient(true)
    if (initialGoals.length === 0) {
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding')
      setShowOnboarding(!hasSeenOnboarding)
    }
  }, [initialGoals.length])

  // 已废弃：从内置模板创建目标（已整合到模板库）
  // 此函数已不再使用，保留用于向后兼容

  // 从模板库创建目标（支持多阶段）
  const handleCreateGoalFromTemplateLibrary = async () => {
    // 验证必填项
    if (!goalName || !goalName.trim()) {
      toast.error('请填写目标名称', {
        description: '目标名称是必填项',
      })
      return
    }

    if (!goalStartDate) {
      toast.error('请选择开始日期', {
        description: '开始日期是必填项',
      })
      return
    }

    if (!goalEndDate) {
      toast.error('请选择结束日期', {
        description: '结束日期是必填项',
      })
      return
    }

    if (!selectedGoalTemplate) {
      toast.error('请选择一个目标模板', {
        description: '需要从模板库中选择一个模板',
      })
      return
    }

    // 验证日期逻辑
    if (goalEndDate < goalStartDate) {
      toast.error('结束日期不能早于开始日期', {
        description: '请调整日期设置',
      })
      return
    }

    // 校验阶段和行动
    if (templatePhases.length === 0) {
      toast.error('至少需要一个阶段', {
        description: '请确保模板包含至少一个阶段',
      })
      return
    }

    const hasEmptyPhase = templatePhases.some(phase => !phase.name || phase.actions.length === 0)
    if (hasEmptyPhase) {
      toast.error('阶段信息不完整', {
        description: '每个阶段必须有名称和至少一个行动模板',
      })
      return
    }

    setIsCreatingGoal(true)
    try {
      // 支持多阶段创建
      const phases = templatePhases.map((phase) => {
        const actions = phase.actions.map((action: any) => {
          // 解析每个行动模板的生成数量
          const parsedCount = action.count ? parseInt(action.count) : NaN
          const actionCount = (!isNaN(parsedCount) && parsedCount >= 1 && parsedCount <= 100) ? parsedCount : 7
          
          return {
        titleTemplate: action.title_template,
        definition: action.definition,
        estimatedTime: action.estimated_time ? parseInt(action.estimated_time) : null,
            count: actionCount, // 每个行动模板的生成数量
          }
        })

        return {
          name: phase.name,
          description: phase.description || null,
          actions,
        }
      })

      // 如果选择了自定义分类且有自定义分类名称，将其添加到第一个阶段的描述中
      if (goalCategory === 'custom' && customCategoryName.trim() && phases.length > 0) {
        const categoryTag = `[分类: ${customCategoryName.trim()}]`
        phases[0].description = phases[0].description 
          ? `${categoryTag} ${phases[0].description}`
          : categoryTag
      }

      const response = await fetch('/api/goals/create-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: goalName,
          category: goalCategory, // 使用用户选择的分类，而不是模板的分类
          start_date: goalStartDate,
          end_date: goalEndDate,
          phases, // 多阶段支持
        }),
      })

      const result = await handleApiResponse<{ success: boolean; data?: { goal: any; phase: any; actions: any[]; actionCount: number } }>(response, '创建失败，请重试')

      if (result.success && result.data) {
        const responseData = result.data.data
        const createdActionCount = responseData?.actionCount ?? responseData?.actions?.length
        
        if (createdActionCount !== undefined && createdActionCount !== null && createdActionCount > 0) {
          toast.success(`目标创建成功，已生成 ${createdActionCount} 个行动`, {
            description: '请点击"设为当前目标"开始执行',
            duration: 5000,
          })
        } else {
          toast.success('目标创建成功，但未生成行动', {
            description: '请先创建行动，然后点击"设为当前目标"',
            duration: 5000,
          })
        }
        router.refresh()
        setIsGoalDialogOpen(false)
        setGoalName('')
        setGoalCategory('health')
        setCustomCategoryName('')
        setGoalStartDate('')
        setGoalEndDate('')
        setUseTemplateLibrary(false)
        setSelectedGoalTemplate(null)
        setTemplatePhases([])
      }
    } catch (error) {
      // handleApiResponse 已处理网络错误
    } finally {
      setIsCreatingGoal(false)
    }
  }

  const handleCreateGoal = async () => {
    // 验证必填项
    if (!goalName || !goalName.trim()) {
      toast.error('请填写目标名称', {
        description: '目标名称是必填项',
      })
      return
    }

    if (!goalStartDate) {
      toast.error('请选择开始日期', {
        description: '开始日期是必填项',
      })
      return
    }
    
    // 校验结束日期必填
    if (!goalEndDate) {
      toast.error('请选择结束日期', {
        description: '结束日期是必填项',
      })
      return
    }

    // 验证日期逻辑
    if (goalEndDate < goalStartDate) {
      toast.error('结束日期不能早于开始日期', {
        description: '请调整日期设置',
      })
      return
    }

    // 统一使用模板库创建接口
    if (useTemplateLibrary && selectedGoalTemplate) {
      await handleCreateGoalFromTemplateLibrary()
      return
    }

    setIsCreatingGoal(true)
    try {
      // 如果选择了自定义分类且有自定义分类名称，将其存储到 sessionStorage
      // 这样在创建第一个阶段时可以获取并保存到阶段的描述中
      if (goalCategory === 'custom' && customCategoryName.trim()) {
        sessionStorage.setItem('pendingCustomCategoryName', customCategoryName.trim())
      }
      
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
        setCustomCategoryName('')
        setGoalStartDate('')
        setGoalEndDate('')
        setUseTemplateLibrary(false)
        
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
    if (!selectedGoalId) {
      toast.error('请先选择目标', {
        description: '需要先选择要添加阶段的目标',
      })
      return
    }

    if (!phaseName || !phaseName.trim()) {
      toast.error('请填写阶段名称', {
        description: '阶段名称是必填项',
      })
      return
    }

    setIsCreatingPhase(true)
    try {
      // 检查是否有待保存的自定义分类名称
      let finalDescription = phaseDescription || ''
      const pendingCustomCategoryName = sessionStorage.getItem('pendingCustomCategoryName')
      
      // 检查目标是否为自定义分类
      const goal = goals.find(g => g.id === selectedGoalId)
      if (goal?.category === 'custom' && pendingCustomCategoryName) {
        // 将自定义分类名称添加到阶段的描述中
        const categoryTag = `[分类: ${pendingCustomCategoryName}]`
        finalDescription = finalDescription 
          ? `${categoryTag} ${finalDescription}`
          : categoryTag
        // 清除 sessionStorage，避免重复使用
        sessionStorage.removeItem('pendingCustomCategoryName')
      }
      
      const response = await fetch('/api/phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: selectedGoalId,
          name: phaseName,
          description: finalDescription || null,
        }),
      })

      const result = await handleApiResponse<{ id: string; goal_id: string; name: string; description: string | null; order_index: number }>(response, '创建失败，请重试')

      if (result.success && result.data) {
        // 【优化】乐观更新：立即添加到UI
        const newPhase = {
          id: result.data.id,
          goal_id: result.data.goal_id,
          name: result.data.name,
          description: result.data.description,
          order_index: result.data.order_index,
          created_at: new Date().toISOString(),
          actions: []
        }
        
        setGoals(prev => prev.map(g => 
          g.id === selectedGoalId
            ? { ...g, phases: [...g.phases, newPhase] }
            : g
        ))
        
        toast.success('阶段创建成功')
        
        // 保存新创建的阶段ID，用于后续打开行动对话框
        const newPhaseId = result.data.id
        
        setIsPhaseDialogOpen(false)
        
        // 检查目标是否有行动，如果没有，自动打开行动对话框
        // 使用更新后的goals状态（包含新创建的阶段）
        const updatedGoal = goals.find(g => g.id === selectedGoalId)
        const hasActions = updatedGoal?.phases?.some(p => p.actions && p.actions.length > 0) ?? false
        
        if (!hasActions && newPhaseId) {
          // 直接打开行动对话框（不需要等待刷新）
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
    if (!selectedPhaseId) {
      toast.error('请先选择阶段', {
        description: '需要先选择要添加行动的阶段',
      })
      return
    }

    if (!actionTitle || !actionTitle.trim()) {
      toast.error('请填写行动标题', {
        description: '行动标题是必填项',
      })
      return
    }

    if (!actionDefinition || !actionDefinition.trim()) {
      toast.error('请填写完成标准', {
        description: '完成标准是必填项，必须是客观可判断的标准',
      })
      return
    }

    // 验证预计时间范围
    if (actionEstimatedTime && (parseInt(actionEstimatedTime) < 1 || parseInt(actionEstimatedTime) > 1440)) {
      toast.error('预计时间应在 1-1440 分钟之间', {
        description: '请调整预计时间',
      })
      return
    }

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

      const result = await handleApiResponse<{ id: string; phase_id: string; title: string; definition: string; estimated_time: number | null; order_index: number; completed_at: string | null }>(response, '创建失败，请重试')

      if (result.success && result.data) {
        // 【优化】乐观更新：立即添加到UI
        const newAction = {
          id: result.data.id,
          phase_id: result.data.phase_id,
          title: result.data.title,
          definition: result.data.definition,
          estimated_time: result.data.estimated_time,
          order_index: result.data.order_index,
          completed_at: result.data.completed_at,
          created_at: new Date().toISOString()
        }
        
        const goal = goals.find(g => g.phases.some(p => p.id === selectedPhaseId))
        if (goal) {
          setGoals(prev => prev.map(g => 
            g.id === goal.id
              ? {
                  ...g,
                  phases: g.phases.map(p =>
                    p.id === selectedPhaseId
                      ? { ...p, actions: [...p.actions, newAction] }
                      : p
                  )
                }
              : g
          ))
        }
        
        toast.success('行动创建成功')
        setIsActionDialogOpen(false)
        setSelectedPhaseId(null)
        setActionTitle('')
        setActionDefinition('')
        setActionEstimatedTime('')
        setIsBatchMode(false)
        setUseActionTemplate(false)
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
    if (!selectedPhaseId || !batchTitleTemplate || !actionDefinition || !batchCount) {
      toast.error('请填写所有必填项', {
        description: '标题模板、完成标准和数量都是必填项',
      })
      return
    }

    const count = parseInt(batchCount)
    if (isNaN(count) || count < 1) {
      toast.error('数量必须大于 0')
      return
    }
    
    if (count > 1000) {
      toast.error('数量不能超过 1000', {
        description: '为了性能考虑，单次最多创建 1000 个行动',
      })
      return
    }

    // 验证标题模板是否包含 {n} 占位符（可选，但给出提示）
    if (!batchTitleTemplate.includes('{n}')) {
      setShowBatchConfirmDialog(true)
      return
    }

    handleConfirmBatchCreate()
  }

  const handleConfirmBatchCreate = async () => {
    setShowBatchConfirmDialog(false)

    // 重新验证参数（防止对话框关闭后参数被修改）
    if (!batchCount || !batchCount.trim()) {
      toast.error('请填写数量')
      return
    }

    const count = parseInt(batchCount)
    if (isNaN(count) || count < 1 || count > 1000) {
      toast.error('数量无效')
      return
    }

    if (!batchTitleTemplate || !batchTitleTemplate.trim()) {
      toast.error('请填写标题模板')
      return
    }

    if (!actionDefinition || !actionDefinition.trim()) {
      toast.error('请填写完成标准')
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
          toast.success(`成功创建 ${createdCount} 个行动`, {
            description: '行动已添加到当前阶段',
            duration: 3000,
          })
        } else if (createdCount === 0) {
          toast.warning('批量创建完成，但未创建任何行动', {
            description: '请检查输入参数',
          })
        } else {
          toast.warning('批量创建完成', {
            description: '创建数量数据异常，请刷新页面查看',
          })
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
      console.error('Batch create error:', error)
      // handleApiResponse 已处理网络错误
    } finally {
      setIsCreatingBatch(false)
    }
  }

  const handleToggleGoalStatus = useCallback(async (goalId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paused' ? 'active' : 'paused'
    
    try {
      const response = await fetch(`/api/goals/${goalId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const result = await handleApiResponse(response, '操作失败，请重试')

      if (result.success) {
        toast.success(newStatus === 'paused' ? '目标已暂停' : '目标已恢复')
        router.refresh()
      }
    } catch (error) {
      // handleApiResponse 已处理错误
    }
  }, [router])

  const handleSetCurrentGoal = useCallback(async (goalId: string) => {
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
  }, [router])

  // 使用 useCallback 优化函数，避免不必要的重新渲染
  const toggleGoal = useCallback((goalId: string) => {
    setExpandedGoals(prev => {
      const newSet = new Set(prev)
    if (newSet.has(goalId)) {
      newSet.delete(goalId)
    } else {
      newSet.add(goalId)
    }
      return newSet
    })
  }, [])

  const togglePhase = useCallback((phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev)
    if (newSet.has(phaseId)) {
      newSet.delete(phaseId)
    } else {
      newSet.add(phaseId)
    }
      return newSet
    })
  }, [])

  // 批量操作功能已启用，可用于生产环境
  // 注意：错误信息仍只在开发环境显示（错误边界中）

  // 使用 useMemo 缓存查找结果，优化性能
  const goalMap = useMemo(() => {
    const map = new Map<string, GoalWithDetails>()
    goals.forEach(goal => map.set(goal.id, goal))
    return map
  }, [goals])

  const phaseMap = useMemo(() => {
    const map = new Map<string, { phase: Phase & { actions: Action[] }, goalId: string }>()
    goals.forEach(goal => {
      goal.phases.forEach(phase => {
        map.set(phase.id, { phase, goalId: goal.id })
      })
    })
    return map
  }, [goals])

  const actionMap = useMemo(() => {
    const map = new Map<string, { action: Action, phaseId: string, goalId: string }>()
    goals.forEach(goal => {
      goal.phases.forEach(phase => {
        phase.actions.forEach(action => {
          map.set(action.id, { action, phaseId: phase.id, goalId: goal.id })
        })
      })
    })
    return map
  }, [goals])

  const handleDeleteGoal = useCallback((goalId: string) => {
    const goal = goalMap.get(goalId)
    if (goal) {
      setDeleteType('goal')
      setDeleteId(goalId)
      setDeleteName(goal.name || '未命名目标')
      setDeleteConfirmOpen(true)
    }
  }, [goalMap])

  const handleDeletePhase = useCallback((phaseId: string) => {
    const phaseData = phaseMap.get(phaseId)
    if (phaseData) {
    setDeleteType('phase')
    setDeleteId(phaseId)
      setDeleteName(phaseData.phase.name || '未命名阶段')
    setDeleteConfirmOpen(true)
  }
  }, [phaseMap])

  const handleDeleteAction = useCallback((actionId: string) => {
    const actionData = actionMap.get(actionId)
    if (actionData) {
    setDeleteType('action')
    setDeleteId(actionId)
      setDeleteName(actionData.action.title || '未命名行动')
    setDeleteConfirmOpen(true)
  }
  }, [actionMap])

  const confirmDelete = async () => {
    if (!deleteId || !deleteType) return

    // 【优化】保存原始状态，用于错误恢复
    const originalGoals = [...goals]

    // 立即更新本地状态（乐观更新）
    if (deleteType === 'goal') {
      setGoals(prev => prev.filter(g => g.id !== deleteId))
    } else if (deleteType === 'phase') {
      const goal = goals.find(g => g.phases.some(p => p.id === deleteId))
      if (goal) {
        setGoals(prev => prev.map(g => 
          g.id === goal.id
            ? { ...g, phases: g.phases.filter(p => p.id !== deleteId) }
            : g
        ))
      }
    } else if (deleteType === 'action') {
      const goal = goals.find(g => g.phases.some(p => p.actions.some(a => a.id === deleteId)))
      if (goal) {
        const phase = goal.phases.find(p => p.actions.some(a => a.id === deleteId))
        if (phase) {
          setGoals(prev => prev.map(g => 
            g.id === goal.id
              ? {
                  ...g,
                  phases: g.phases.map(p =>
                    p.id === phase.id
                      ? { ...p, actions: p.actions.filter(a => a.id !== deleteId) }
                      : p
                  )
                }
              : g
          ))
        }
      }
    }

    // 关闭对话框
    setDeleteConfirmOpen(false)
    const tempDeleteId = deleteId
    const tempDeleteType = deleteType
    const tempSuccessMessage = deleteType === 'goal' ? '目标已删除' : deleteType === 'phase' ? '阶段已删除' : '行动已删除'
    setDeleteType(null)
    setDeleteId(null)
    setDeleteName('')

    try {
      let endpoint = ''
      
      if (tempDeleteType === 'goal') {
        endpoint = `/api/goals/${tempDeleteId}`
      } else if (tempDeleteType === 'phase') {
        endpoint = `/api/phases/${tempDeleteId}`
      } else if (tempDeleteType === 'action') {
        endpoint = `/api/actions/${tempDeleteId}`
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
      })

      const result = await handleApiResponse(response, '删除失败')
      if (result.success) {
        toast.success(tempSuccessMessage)
        // 不需要刷新，已经乐观更新了
      } else {
        // 删除失败，恢复原状态
        setGoals(originalGoals)
        toast.error('删除失败，已恢复')
      }
    } catch (error) {
      // 删除失败，恢复原状态
      setGoals(originalGoals)
      toast.error('删除失败，已恢复')
    }
  }

  // 批量操作函数
  const toggleBatchSelectMode = useCallback(() => {
    setIsBatchSelectMode(prev => {
      if (!prev) {
        // 进入批量模式时清空选择
        setSelectedGoals(new Set())
        setSelectedPhases(new Set())
        setSelectedActions(new Set())
      }
      return !prev
    })
  }, [])

  const toggleGoalSelection = useCallback((goalId: string) => {
    setSelectedGoals(prev => {
      const newSet = new Set(prev)
      if (newSet.has(goalId)) {
        newSet.delete(goalId)
      } else {
        newSet.add(goalId)
      }
      return newSet
    })
  }, [])

  const togglePhaseSelection = useCallback((phaseId: string) => {
    setSelectedPhases(prev => {
      const newSet = new Set(prev)
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId)
      } else {
        newSet.add(phaseId)
      }
      return newSet
    })
  }, [])

  const toggleActionSelection = useCallback((actionId: string) => {
    setSelectedActions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(actionId)) {
        newSet.delete(actionId)
      } else {
        newSet.add(actionId)
      }
      return newSet
    })
  }, [])

  const selectAllGoals = useCallback(() => {
    if (selectedGoals.size === goals.length) {
      setSelectedGoals(new Set())
    } else {
      setSelectedGoals(new Set(goals.map(g => g.id)))
    }
  }, [goals, selectedGoals.size])

  const handleBatchDelete = useCallback(async () => {
    const totalSelected = selectedGoals.size + selectedPhases.size + selectedActions.size
    if (totalSelected === 0) {
      toast.error('请先选择要删除的项目')
      return
    }

    // 使用 Dialog 确认（但这里先用简单的 confirm，后续可以优化为 Dialog）
    const confirmed = window.confirm(
      `确定要删除选中的 ${totalSelected} 个项目吗？\n` +
      (selectedGoals.size > 0 ? `- ${selectedGoals.size} 个目标\n` : '') +
      (selectedPhases.size > 0 ? `- ${selectedPhases.size} 个阶段\n` : '') +
      (selectedActions.size > 0 ? `- ${selectedActions.size} 个行动\n` : '') +
      '\n此操作不可撤销！'
    )

    if (!confirmed) return

    // 【优化】保存原始状态，用于错误恢复
    const originalGoals = [...goals]
    const selectedGoalsArray = Array.from(selectedGoals)
    const selectedPhasesArray = Array.from(selectedPhases)
    const selectedActionsArray = Array.from(selectedActions)

    // 立即更新本地状态（乐观更新）
    setGoals(prev => {
      // 先删除行动
      let updated = prev.map(g => ({
        ...g,
        phases: g.phases.map(p => ({
          ...p,
          actions: p.actions.filter(a => !selectedActionsArray.includes(a.id))
        }))
      }))
      
      // 再删除阶段
      updated = updated.map(g => ({
        ...g,
        phases: g.phases.filter(p => !selectedPhasesArray.includes(p.id))
      }))
      
      // 最后删除目标
      updated = updated.filter(g => !selectedGoalsArray.includes(g.id))
      
      return updated
    })

    // 清空选择并退出批量模式
    setSelectedGoals(new Set())
    setSelectedPhases(new Set())
    setSelectedActions(new Set())
    setIsBatchSelectMode(false)

    setIsBatchDeleting(true)
    let successCount = 0
    let failCount = 0
    const failedItems: { type: 'goal' | 'phase' | 'action', id: string }[] = []

    try {
      // 【性能优化】使用并发删除，提高性能
      // 批量删除行动
      const actionDeletePromises = selectedActionsArray.map(async (actionId) => {
        try {
          const response = await fetch(`/api/actions/${actionId}`, { method: 'DELETE' })
          return { type: 'action' as const, id: actionId, success: response.ok }
        } catch (error) {
          return { type: 'action' as const, id: actionId, success: false }
        }
      })

      // 批量删除阶段
      const phaseDeletePromises = selectedPhasesArray.map(async (phaseId) => {
        try {
          const response = await fetch(`/api/phases/${phaseId}`, { method: 'DELETE' })
          return { type: 'phase' as const, id: phaseId, success: response.ok }
        } catch (error) {
          return { type: 'phase' as const, id: phaseId, success: false }
        }
      })

      // 批量删除目标
      const goalDeletePromises = selectedGoalsArray.map(async (goalId) => {
        try {
          const response = await fetch(`/api/goals/${goalId}`, { method: 'DELETE' })
          return { type: 'goal' as const, id: goalId, success: response.ok }
        } catch (error) {
          return { type: 'goal' as const, id: goalId, success: false }
        }
      })

      // 并发执行所有删除操作
      const allResults = await Promise.allSettled([
        ...actionDeletePromises,
        ...phaseDeletePromises,
        ...goalDeletePromises,
      ])

      // 处理结果
      for (const result of allResults) {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successCount++
          } else {
            failCount++
            failedItems.push({ type: result.value.type, id: result.value.id })
          }
        } else {
          failCount++
          // 无法确定具体失败的项目，记录错误
          console.error('Delete operation failed:', result.reason)
        }
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`成功删除 ${successCount} 个项目`)
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`部分删除成功：${successCount} 个成功，${failCount} 个失败`)
        // 部分失败，恢复失败的项目
        setGoals(originalGoals)
        // 重新尝试删除成功的项目（简化处理：直接刷新）
        router.refresh()
      } else if (failCount > 0) {
        toast.error(`删除失败，共 ${failCount} 个项目`)
        // 全部失败，恢复原状态
        setGoals(originalGoals)
      }
    } catch (error) {
      toast.error('批量删除过程中发生错误')
      // 发生错误，恢复原状态
      setGoals(originalGoals)
    } finally {
      setIsBatchDeleting(false)
    }
  }, [selectedGoals, selectedPhases, selectedActions, goals, router])

  // 处理阶段拖拽结束（带防抖和重试机制）
  const handlePhaseDragEnd = useCallback(async (event: DragEndEvent, goalId: string) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    // 如果正在排序，忽略新的拖拽操作
    if (isReorderingPhases) {
      return
    }

    const goal = goals.find(g => g.id === goalId)
    if (!goal) return

    const oldIndex = goal.phases.findIndex(p => p.id === active.id)
    const newIndex = goal.phases.findIndex(p => p.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newPhases = arrayMove(goal.phases, oldIndex, newIndex)
    const phaseIds = newPhases.map((p: Phase) => p.id)

    // 【修复】保存原始状态，用于错误恢复
    const originalPhases = [...goal.phases]

    // 立即更新本地状态（乐观更新）
    setGoals(prev => prev.map(g => 
      g.id === goalId 
        ? { ...g, phases: newPhases }
        : g
    ))

    // 清除之前的防抖定时器
    if (phaseReorderTimeoutRef.current) {
      clearTimeout(phaseReorderTimeoutRef.current)
    }

    // 防抖处理：延迟300ms执行，避免快速拖拽时的并发请求
    phaseReorderTimeoutRef.current = setTimeout(async () => {
      setIsReorderingPhases(true)
      
      // 重试机制：最多重试3次
      let retryCount = 0
      const maxRetries = 3
      let success = false

      while (retryCount < maxRetries && !success) {
        try {
          const response = await fetch('/api/phases/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phaseIds }),
          })

          const result = await handleApiResponse(response, '更新排序失败')
          if (result.success) {
            success = true
            toast.success('排序已更新')
          } else {
            retryCount++
            if (retryCount < maxRetries) {
              // 等待后重试（指数退避）
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100))
            } else {
              // 重试失败，恢复原状态
              setGoals(prev => prev.map(g => 
                g.id === goalId 
                  ? { ...g, phases: originalPhases }
                  : g
              ))
              toast.error('更新排序失败，已恢复原顺序')
            }
          }
        } catch (error) {
          retryCount++
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100))
          } else {
            // 重试失败，恢复原状态
            setGoals(prev => prev.map(g => 
              g.id === goalId 
                ? { ...g, phases: originalPhases }
                : g
            ))
            toast.error('更新排序失败，已恢复原顺序')
          }
        }
      }

      setIsReorderingPhases(false)
    }, 300) // 300ms防抖延迟
  }, [goals, isReorderingPhases])

  // 处理行动拖拽结束（带防抖和重试机制）
  const handleActionDragEnd = useCallback(async (event: DragEndEvent, phaseId: string) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    // 如果正在排序，忽略新的拖拽操作
    if (isReorderingActions) {
      return
    }

    // 找到包含该阶段的目标
    const goal = goals.find(g => g.phases.some(p => p.id === phaseId))
    if (!goal) return

    const phase = goal.phases.find(p => p.id === phaseId)
    if (!phase) return

    const oldIndex = phase.actions.findIndex(a => a.id === active.id)
    const newIndex = phase.actions.findIndex(a => a.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newActions = arrayMove(phase.actions, oldIndex, newIndex)
    const actionIds = newActions.map((a: Action) => a.id)

    // 【修复】保存原始状态，用于错误恢复
    const originalActions = [...phase.actions]

    // 立即更新本地状态（乐观更新）
    setGoals(prev => prev.map(g => 
      g.id === goal.id
        ? {
            ...g,
            phases: g.phases.map(p =>
              p.id === phaseId
                ? { ...p, actions: newActions }
                : p
            )
          }
        : g
    ))

    // 清除之前的防抖定时器
    if (actionReorderTimeoutRef.current) {
      clearTimeout(actionReorderTimeoutRef.current)
    }

    // 防抖处理：延迟300ms执行，避免快速拖拽时的并发请求
    actionReorderTimeoutRef.current = setTimeout(async () => {
      setIsReorderingActions(true)
      
      // 重试机制：最多重试3次
      let retryCount = 0
      const maxRetries = 3
      let success = false

      while (retryCount < maxRetries && !success) {
        try {
          const response = await fetch('/api/actions/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actionIds }),
          })

          const result = await handleApiResponse(response, '更新排序失败')
          if (result.success) {
            success = true
            toast.success('排序已更新')
          } else {
            retryCount++
            if (retryCount < maxRetries) {
              // 等待后重试（指数退避）
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100))
            } else {
              // 重试失败，恢复原状态
              setGoals(prev => prev.map(g => 
                g.id === goal.id
                  ? {
                      ...g,
                      phases: g.phases.map(p =>
                        p.id === phaseId
                          ? { ...p, actions: originalActions }
                          : p
                      )
                    }
                  : g
              ))
              toast.error('更新排序失败，已恢复原顺序')
            }
          }
        } catch (error) {
          retryCount++
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100))
          } else {
            // 重试失败，恢复原状态
            setGoals(prev => prev.map(g => 
              g.id === goal.id
                ? {
                    ...g,
                    phases: g.phases.map(p =>
                      p.id === phaseId
                        ? { ...p, actions: originalActions }
                        : p
                    )
                  }
                : g
            ))
            toast.error('更新排序失败，已恢复原顺序')
          }
        }
      }

      setIsReorderingActions(false)
    }, 300) // 300ms防抖延迟
  }, [goals, isReorderingActions])

  return (
    <div className="min-h-screen p-4 pt-20 bg-background">
      {/* 新用户引导 - 只在客户端渲染，避免水合错误 */}
      {isClient && showOnboarding && (
        <OnboardingGuide
          onStart={() => {
            setShowOnboarding(false)
            setIsGoalDialogOpen(true)
            localStorage.setItem('hasSeenOnboarding', 'true')
          }}
          onDismiss={() => {
            setShowOnboarding(false)
            localStorage.setItem('hasSeenOnboarding', 'true')
          }}
        />
      )}
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h1 className="text-2xl font-bold">目标规划</h1>
          <div className="flex gap-2">
            <Button
              variant={isBatchSelectMode ? 'default' : 'outline'}
              onClick={toggleBatchSelectMode}
              disabled={isBatchDeleting}
              aria-label={isBatchSelectMode ? '退出批量模式' : '进入批量操作模式'}
            >
              {isBatchSelectMode ? (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  退出批量模式
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  批量操作
                </>
              )}
            </Button>
          <Button onClick={() => setIsGoalDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新建目标
          </Button>
          </div>
        </div>

        {/* 批量操作工具栏 */}
        {isBatchSelectMode && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">
                    已选择：{selectedGoals.size + selectedPhases.size + selectedActions.size} 项
                  </span>
                  {selectedGoals.size > 0 && (
                    <span className="text-muted-foreground">{selectedGoals.size} 个目标</span>
                  )}
                  {selectedPhases.size > 0 && (
                    <span className="text-muted-foreground">{selectedPhases.size} 个阶段</span>
                  )}
                  {selectedActions.size > 0 && (
                    <span className="text-muted-foreground">{selectedActions.size} 个行动</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedGoals.size > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={selectAllGoals}
                    >
                      {selectedGoals.size === goals.length ? '取消全选' : '全选目标'}
                    </Button>
                  )}
                  {(selectedGoals.size > 0 || selectedPhases.size > 0 || selectedActions.size > 0) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBatchDelete}
                      disabled={isBatchDeleting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isBatchDeleting ? '删除中...' : '批量删除'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {goals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-6">
              <div className="space-y-3">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-xl font-semibold">还没有目标，创建一个开始吧</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  建议使用模板快速创建，系统会自动生成阶段和示例行动，帮助你快速开始执行
                </p>
              </div>
              <div className="flex justify-center">
                <Button onClick={() => setIsGoalDialogOpen(true)} size="lg" className="min-w-[140px]">
                  <Plus className="w-4 h-4 mr-2" />
                创建目标
                </Button>
              </div>
              <div className="pt-4 border-t space-y-2">
                <p className="text-xs font-medium text-muted-foreground">💡 快速开始提示：</p>
                <ul className="text-xs text-muted-foreground space-y-1 max-w-md mx-auto text-left">
                  <li>• 点击&ldquo;创建目标&rdquo;后，可以勾选&ldquo;使用模板快速创建&rdquo;来快速生成阶段和行动</li>
                  <li>• 也可以手动创建目标，然后逐步添加阶段和行动</li>
                  <li>• 创建完成后，记得点击&ldquo;设为当前目标&rdquo;开始执行</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              // 使用局部变量优化渲染性能
              const isExpanded = expandedGoals.has(goal.id)
              const hasPhases = goal.phases.length > 0
              
              // 获取分类显示名称（支持自定义分类）
              const getCategoryDisplayName = (category: string, phases: typeof goal.phases) => {
                if (category === 'health') return '健康'
                if (category === 'learning') return '学习'
                if (category === 'project') return '项目'
                if (category === 'custom') {
                  // 尝试从第一个阶段的描述中提取自定义分类名称
                  if (phases.length > 0 && phases[0].description) {
                    const match = phases[0].description.match(/\[分类:\s*([^\]]+)\]/)
                    if (match && match[1]) {
                      return match[1].trim()
                    }
                  }
                  return '自定义'
                }
                return '未分类'
              }
              
              return (
              <Card key={goal.id} className="hover:shadow-lg transition-shadow duration-200 rounded-xl overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 transition-transform" />
                        ) : (
                          <ChevronRight className="w-5 h-5 transition-transform" />
                        )}
                      </button>
                      <CardTitle className="text-xl truncate">{goal.name || '未命名目标'}</CardTitle>
                      <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full flex-shrink-0">
                        {getCategoryDisplayName(goal.category, goal.phases)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {/* 状态标签 */}
                      {goal.status === 'paused' && (
                        <span className="text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded flex items-center gap-1">
                          <Pause className="w-3 h-3" />
                          已暂停
                        </span>
                      )}
                      {goal.status === 'completed' && (
                        <span className="text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                          已完成
                        </span>
                      )}
                      
                      {/* 暂停/恢复按钮 */}
                      {goal.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleGoalStatus(goal.id, goal.status)}
                          title={goal.status === 'paused' ? '恢复目标' : '暂停目标'}
                        >
                          {goal.status === 'paused' ? (
                            <>
                              <Play className="w-3 h-3 mr-1" />
                              恢复
                            </>
                          ) : (
                            <>
                              <Pause className="w-3 h-3 mr-1" />
                              暂停
                            </>
                          )}
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetCurrentGoal(goal.id)}
                        disabled={goal.status === 'completed' || goal.status === 'paused'}
                        title={goal.status === 'completed' ? '已完成的目标无法设为当前目标' : goal.status === 'paused' ? '已暂停的目标无法设为当前目标' : ''}
                      >
                        设为当前目标
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="删除目标"
                        title="删除目标"
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {goal.start_date || '开始日期未设置'} {goal.end_date ? `- ${goal.end_date}` : ''}
                  </CardDescription>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="space-y-4">
                    {!hasPhases ? (
                      <div className="text-center py-6 space-y-3 border border-dashed rounded-lg">
                      <p className="text-sm text-muted-foreground">还没有阶段</p>
                              <Button
                                size="sm"
                          variant="outline"
                                onClick={() => {
                            setSelectedGoalId(goal.id)
                            setIsPhaseDialogOpen(true)
                                }}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                          添加第一个阶段
                              </Button>
                            </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event: DragEndEvent) => handlePhaseDragEnd(event, goal.id)}
                      >
                        <SortableContext
                          items={goal.phases.map(p => p.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {goal.phases.map((phase) => {
                            const isPhaseSelected = selectedPhases.has(phase.id)
                            const isPhaseExpanded = expandedPhases.has(phase.id)
                            
                            return (
                              <div key={phase.id}>
                                <SortablePhaseItem
                                  phase={phase}
                                  goalId={goal.id}
                                  isPhaseSelected={isPhaseSelected}
                                  isPhaseExpanded={isPhaseExpanded}
                                  isBatchSelectMode={isBatchSelectMode}
                                  onTogglePhase={togglePhase}
                                  onTogglePhaseSelection={togglePhaseSelection}
                                  onAddAction={() => {
                                    setSelectedPhaseId(phase.id)
                                    setIsActionDialogOpen(true)
                                  }}
                                  onDeletePhase={handleDeletePhase}
                                  onDragEnd={handlePhaseDragEnd}
                                />
                          {phase.description && (
                                  <p className="text-sm text-muted-foreground ml-6">{phase.description}</p>
                          )}
                                {isPhaseExpanded && (
                            <div className="space-y-2 ml-6">
                              {phase.actions.length === 0 ? (
                                      <div className="text-center py-4 space-y-2 border border-dashed rounded-lg bg-muted/30">
                                <p className="text-sm text-muted-foreground">还没有行动</p>
                                      <Button
                                        size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedPhaseId(phase.id)
                                            setIsActionDialogOpen(true)
                                          }}
                                          disabled={isBatchSelectMode}
                                      >
                                          <Plus className="w-3 h-3 mr-1" />
                                          添加第一个行动
                                      </Button>
                                  </div>
                                    ) : (
                                      <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={(event: DragEndEvent) => handleActionDragEnd(event, phase.id)}
                                      >
                                        <SortableContext
                                          items={phase.actions.map(a => a.id)}
                                          strategy={verticalListSortingStrategy}
                                        >
                                          {phase.actions.map((action) => {
                                            const isActionSelected = selectedActions.has(action.id)
                                            
                                            return (
                                              <SortableActionItem
                                                key={action.id}
                                                action={action}
                                                phaseId={phase.id}
                                                isActionSelected={isActionSelected}
                                                isBatchSelectMode={isBatchSelectMode}
                                                onToggleActionSelection={toggleActionSelection}
                                                onDeleteAction={handleDeleteAction}
                                                onDragEnd={handleActionDragEnd}
                                              />
                                            )
                                          })}
                                        </SortableContext>
                                      </DndContext>
                              )}
                            </div>
                          )}
                        </div>
                            )
                          })}
                        </SortableContext>
                      </DndContext>
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
              )
            })}
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
                onValueChange={(v: 'health' | 'learning' | 'project' | 'custom') => {
                  setGoalCategory(v)
                  if (v !== 'custom') {
                    setCustomCategoryName('')
                  }
                  // 切换模板时显示高亮动画
                  setIsPreviewExpanded(true)
                  // 如果使用模板库，用默认日期初始化（如果还未设置）
                  if (useTemplateLibrary && !goalStartDate) {
                    setGoalStartDate(getToday())
                  }
                  if (useTemplateLibrary && !goalEndDate) {
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
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
              {goalCategory === 'custom' && (
                <div className="mt-2">
                  <Label htmlFor="custom-category-name" className="text-sm text-muted-foreground">
                    自定义分类名称（可选）
                  </Label>
                  <Input
                    id="custom-category-name"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder="例如：工作、生活、兴趣等"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 输入自定义分类名称，方便后续管理和查找
                  </p>
                </div>
              )}
            </div>
            
            {/* 模板化创建选项 - 统一使用模板库 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="use-template-library"
                  checked={useTemplateLibrary}
                  aria-label="使用模板快速创建"
                  onChange={(e) => {
                    const checked = e.target.checked
                    setUseTemplateLibrary(checked)
                    if (checked) {
                      setIsPreviewExpanded(true)
                      // 使用模板时，用默认值初始化字段（如果还未设置）
                      if (!goalStartDate) {
                        setGoalStartDate(getToday())
                      }
                      if (!goalEndDate) {
                        const baseDate = goalStartDate || getToday()
                        setGoalEndDate(getRelativeDate(30, baseDate))
                      }
                    } else {
                      setSelectedGoalTemplate(null)
                      setTemplatePhases([])
                    }
                  }}
                  className="rounded"
                />
                <Label htmlFor="use-template-library" className="cursor-pointer">
                  使用模板快速创建（从模板库选择，支持多阶段、排序、编辑）
                </Label>
              </div>
              
              {/* 从模板库选择 */}
              {useTemplateLibrary && (
                <div className="ml-6 space-y-3 p-3 bg-muted rounded min-w-0">
                  {!selectedGoalTemplate ? (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded">
                        💡 请从模板库选择一个模板，然后可以编辑、排序、添加删除阶段和行动
                      </div>
                      <div className="border rounded-lg p-4 md:p-6 bg-background max-h-[500px] overflow-y-auto">
                        <GoalTemplateSelector
                          selectMode={true}
                          selectCategory={goalCategory}
                          onSelect={(template) => {
                            console.log('Template selected:', template)
                            // 确保模板数据存在
                            if (!template) {
                              toast.error('模板数据无效')
                              return
                            }
                            
                            setSelectedGoalTemplate(template)
                            
                            // 将模板转换为可编辑格式
                            // 检查模板是否有 phases 数组（多阶段支持）
                            let phasesToSet = []
                            
                            // 使用类型断言处理可能的多阶段模板
                            const templateWithPhases = template as any
                            if (templateWithPhases.phases && Array.isArray(templateWithPhases.phases) && templateWithPhases.phases.length > 0) {
                              // 多阶段模板
                              phasesToSet = templateWithPhases.phases.map((phase: any) => ({
                                name: phase.name || '',
                                description: phase.description || '',
                                actions: (phase.actions || []).map((action: any) => ({
                                  title_template: action.title_template || '',
                                  definition: action.definition || '',
                                  estimated_time: action.estimated_time?.toString() || '',
                                  count: action.count?.toString() || '7',
                                })),
                              }))
                            } else {
                              // 单阶段模板（兼容旧格式）
                              phasesToSet = [{
                                name: template.phase_name || '',
                                description: template.phase_description || '',
                                actions: (template.actions || []).map((action: any) => ({
                                  title_template: action.title_template || '',
                                  definition: action.definition || '',
                                  estimated_time: action.estimated_time?.toString() || '',
                                  count: action.count?.toString() || '7',
                                })),
                              }]
                            }
                            
                            if (phasesToSet.length === 0) {
                              toast.error('模板没有阶段数据')
                              return
                            }
                            
                            setTemplatePhases(phasesToSet)
                            console.log('Template phases set:', phasesToSet)
                            toast.success('模板已选择，可以开始编辑')
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <TemplateEditor
                      template={selectedGoalTemplate}
                      phases={templatePhases}
                      onPhasesChange={setTemplatePhases}
                      onRemoveTemplate={() => {
                        setSelectedGoalTemplate(null)
                        setTemplatePhases([])
                      }}
                    />
                  )}
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
            
            {/* 预览部分 */}
            <div className="border-t pt-4 mt-4">
              <button
                type="button"
                onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                className="flex items-center justify-between w-full text-left"
              >
                <Label className="text-sm font-semibold cursor-pointer">目标预览</Label>
                {isPreviewExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {isPreviewExpanded && (
                <div className="mt-3 p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">目标名称：</span>
                      <span className="text-sm font-medium">{goalName || '未填写'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">分类：</span>
                      <span className="text-sm font-medium">
                        {(() => {
                          if (goalCategory === 'health') return '健康'
                          if (goalCategory === 'learning') return '学习'
                          if (goalCategory === 'project') return '项目'
                          if (goalCategory === 'custom') {
                            return customCategoryName.trim() || '自定义'
                          }
                          return '未选择'
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">开始日期：</span>
                      <span className="text-sm">{goalStartDate || '未设置'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">结束日期：</span>
                      <span className="text-sm">{goalEndDate || '未设置'}</span>
                    </div>
                    {useTemplateLibrary && selectedGoalTemplate && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">使用模板：</span>
                        <span className="text-sm">{selectedGoalTemplate.name}</span>
                      </div>
                    )}
                    {useTemplateLibrary && templatePhases.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-muted-foreground">阶段数量：</span>
                        <span className="text-sm">{templatePhases.length} 个阶段</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                  <Textarea
                    id="action-definition-batch"
                    value={actionDefinition}
                    onChange={(e) => setActionDefinition(e.target.value)}
                    placeholder="例如：完成 3 组平板支撑，每组 60 秒"
                    rows={3}
                    className="resize-none"
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      💡 一个行动可以包含多个行为，只要完成标准明确即可
                    </p>
                  <p className="text-xs text-muted-foreground">
                    所有行动将共用此完成标准（支持占位符，如 {"{date}"}、{"{userName}"} 等）
                  </p>
                  </div>
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
                {/* 使用模板选项 */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="use-action-template"
                    checked={useActionTemplate}
                    aria-label="使用行动模板"
                    onChange={(e) => setUseActionTemplate(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="use-action-template" className="cursor-pointer text-sm">
                    从模板库选择
                  </Label>
                </div>

                {useActionTemplate ? (
                  <div className="border rounded-lg p-3 bg-muted/50 max-h-96 overflow-y-auto">
                    <ActionTemplateSelector
                      onSelect={(template) => {
                        setActionTitle(template.title)
                        setActionDefinition(template.definition)
                        setActionEstimatedTime(template.estimated_time?.toString() || '')
                        setUseActionTemplate(false)
                        toast.success('模板已应用')
                      }}
                      selectedCategory={goals.find(g => g.phases.some(p => p.id === selectedPhaseId))?.category}
                    />
                  </div>
                ) : (
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
                      <Textarea
                        id="action-definition"
                        value={actionDefinition}
                        onChange={(e) => setActionDefinition(e.target.value)}
                        placeholder="例如：完成 3 组平板支撑，每组 60 秒"
                        rows={3}
                        className="resize-none"
                      />
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          💡 一个行动可以包含多个行为，只要完成标准明确即可
                        </p>
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            查看示例
                          </summary>
                          <div className="mt-2 space-y-2 pl-4 border-l-2 border-primary/20">
                            <div>
                              <p className="font-medium text-foreground mb-1">健身示例：</p>
                              <p className="text-muted-foreground">
                                热身 ≥ 10分钟 + 训练 ≥ 40分钟 + 拉伸 ≥ 10分钟，总时长 ≥ 60分钟
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-foreground mb-1">学习示例：</p>
                              <p className="text-muted-foreground">
                                阅读指定章节 + 完成笔记 + 完成课后练习
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-foreground mb-1">简单示例：</p>
                              <p className="text-muted-foreground">
                                完成 3 组平板支撑，每组 60 秒
                              </p>
                            </div>
                          </div>
                        </details>
                      </div>
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
              </>
            )}
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-3">
            <Button variant="outline" onClick={() => {
              setIsActionDialogOpen(false)
              setIsBatchMode(false)
              setBatchTitleTemplate('')
              setBatchCount('')
              setUseActionTemplate(false)
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

      {/* 批量创建确认对话框 */}
      <Dialog open={showBatchConfirmDialog} onOpenChange={setShowBatchConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认批量创建</DialogTitle>
            <DialogDescription>
              标题模板中没有找到 {"{n}"} 占位符，所有行动将使用相同的标题。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              建议使用 {"{n}"} 占位符来区分不同的行动，例如：
            </p>
            <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
              <div className="font-medium">示例：</div>
              <div>• &ldquo;第 {"{n}"} 天训练&rdquo; → 第 1 天训练、第 2 天训练...</div>
              <div>• &ldquo;核心训练 Day {"{n}"}&rdquo; → 核心训练 Day 1、核心训练 Day 2...</div>
            </div>
            <p className="text-sm text-muted-foreground">
              如果继续，将创建 {batchCount || 'N'} 个标题相同的行动。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchConfirmDialog(false)}>
              取消
            </Button>
            <Button onClick={handleConfirmBatchCreate} disabled={isCreatingBatch}>
              {isCreatingBatch ? '创建中...' : '确认创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  )
}

