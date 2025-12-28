'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Edit2, Target, Sparkles, ChevronUp, ChevronDown, GripVertical, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { handleApiResponse } from '@/lib/utils'

interface GoalTemplateAction {
  id?: string
  action_template_id?: string | null
  title_template: string
  definition: string
  estimated_time: number | null
  order_index: number
}

interface GoalTemplatePhase {
  id: string
  goal_template_id: string
  name: string
  description: string | null
  order_index: number
  created_at: string
  updated_at: string
  actions?: GoalTemplateAction[]
}

interface GoalTemplate {
  id: string
  user_id: string
  category: 'health' | 'learning' | 'project' | 'custom'
  name: string
  phase_name: string // 向后兼容
  phase_description: string | null // 向后兼容
  description: string | null
  is_system: boolean
  created_at: string
  updated_at: string
  actions?: GoalTemplateAction[] // 向后兼容
  phases?: GoalTemplatePhase[] // 多阶段支持
}

interface GoalTemplateSelectorProps {
  onSelect?: (template: GoalTemplate) => void
  // 选择模式：传入类别，只显示该类别的模板，隐藏管理功能
  selectMode?: boolean
  selectCategory?: 'health' | 'learning' | 'project' | 'custom'
  // 快速创建模式：选择模板后直接创建目标
  quickCreate?: boolean
  onQuickCreate?: (template: GoalTemplate) => void
}

/**
 * 目标模板选择器
 * 支持两种模式：
 * 1. 管理模式：完整功能，包括创建、编辑、删除等
 * 2. 选择模式：简化UI，只用于选择模板
 */
export default function GoalTemplateSelector({ onSelect, selectMode = false, selectCategory, quickCreate = false, onQuickCreate }: GoalTemplateSelectorProps) {
  const [templates, setTemplates] = useState<GoalTemplate[]>([])
  // 选择模式下使用传入的类别，否则使用状态管理
  const [category, setCategory] = useState<'health' | 'learning' | 'project' | 'custom' | 'all'>(
    selectMode && selectCategory ? selectCategory : 'all'
  )
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showInitDialog, setShowInitDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState<GoalTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<GoalTemplate | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [customCategoryName, setCustomCategoryName] = useState('') // 自定义分类名称
  const [isMounted, setIsMounted] = useState(false) // 用于防止 hydration 错误
  
  // 确保只在客户端渲染条件内容
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // 改进：支持多个阶段
  interface PhaseTemplate {
    name: string
    description: string
    actions: Array<{ title_template: string; definition: string; estimated_time: string }>
  }

  const [newTemplate, setNewTemplate] = useState<{
    category: 'health' | 'learning' | 'project' | 'custom'
    name: string
    description: string
    phases: PhaseTemplate[]
  }>({
    category: 'custom',
    name: '',
    description: '',
    phases: [{ name: '', description: '', actions: [] }],
  })

  // 加载模板
  useEffect(() => {
    loadTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, selectCategory])
  
  // 选择模式下，如果类别改变，更新类别
  useEffect(() => {
    if (selectMode && selectCategory) {
      setCategory(selectCategory)
    }
  }, [selectMode, selectCategory])

  const loadTemplates = async (forceRefresh = false) => {
    setIsLoading(true)
    try {
      // 选择模式下使用 selectCategory，否则使用 category
      const currentCategory = selectMode && selectCategory ? selectCategory : category
      // 添加时间戳防止缓存，特别是在删除后强制刷新时
      const timestamp = forceRefresh ? `&_t=${Date.now()}` : `&_t=${Date.now()}`
      const url = currentCategory === 'all' 
        ? `/api/goal-templates?${timestamp}`
        : `/api/goal-templates?category=${currentCategory}${timestamp}`
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.code === 'TABLE_NOT_FOUND') {
          toast.error('模板功能未初始化，请执行数据库迁移', {
            description: '需要在 Supabase 中执行 migration_add_goal_templates.sql',
            duration: 5000
          })
        } else {
          toast.error(errorData.error || '加载模板失败')
        }
        setIsLoading(false)
        setTemplates([])
        return
      }
      
      const result = await handleApiResponse<{ data: GoalTemplate[] }>(response, '加载模板失败')
      
      if (result.success && result.data) {
        const templates = Array.isArray(result.data.data) ? result.data.data : 
                         Array.isArray(result.data) ? result.data : []
        
        // 去重：确保没有重复的模板（按 ID）
        const uniqueTemplates = templates.filter((template, index, self) =>
          index === self.findIndex(t => t.id === template.id)
        )
        
        console.log('Loaded templates:', {
          total: templates.length,
          unique: uniqueTemplates.length,
          templateIds: uniqueTemplates.map(t => ({ id: t.id, name: t.name, is_system: t.is_system }))
        })
        
        setTemplates(uniqueTemplates)
      } else {
        setTemplates([])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('加载模板失败，请刷新页面重试')
      setTemplates([])
    } finally {
      setIsLoading(false)
    }
  }

  // 初始化默认模板
  const handleInitDefaults = async () => {
    setIsInitializing(true)
    try {
      const response = await fetch('/api/goal-templates/init-defaults', {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.code === '42P01' || errorData.error?.includes('relation') || errorData.error?.includes('table')) {
          toast.error('数据库表不存在', {
            description: '请先在 Supabase 中执行 migration_add_goal_templates.sql',
            duration: 5000
          })
        } else {
          toast.error(errorData.error || '初始化失败')
        }
        return
      }

      const result = await handleApiResponse<{
        message?: string
        data?: any[]
      }>(response, '初始化失败')
      
      if (result.success) {
        if (result.data?.message?.includes('already exist')) {
          toast.info('默认模板已存在，如需更新请先删除旧模板')
        } else {
          const createdCount = result.data?.data?.length || 0
          toast.success(result.data?.message || '默认模板已初始化', {
            description: `已创建 ${createdCount} 个系统模板（包含所有阶段）`,
            duration: 5000,
          })
        }
        // 延迟一下再加载，确保数据已写入
        setTimeout(() => {
          loadTemplates(true)
        }, 500)
      }
    } catch (error) {
      console.error('Error initializing defaults:', error)
      toast.error('初始化失败，请检查控制台错误信息')
    } finally {
      setIsInitializing(false)
    }
  }

  // 创建模板（支持多阶段）
  const handleCreateTemplate = async () => {
    // 验证模板名称
    if (!newTemplate.name?.trim()) {
      toast.error('请填写模板名称')
      return
    }

    // 验证阶段
    if (newTemplate.phases.length === 0) {
      toast.error('至少需要一个阶段')
      return
    }

    // 验证所有阶段
    for (let i = 0; i < newTemplate.phases.length; i++) {
      const phase = newTemplate.phases[i]
      if (!phase.name?.trim()) {
        toast.error(`请填写第 ${i + 1} 个阶段的名称`)
      return
    }
      if (phase.actions.length === 0) {
        toast.error(`第 ${i + 1} 个阶段至少需要一个行动`)
      return
    }
    // 验证所有行动
      const hasInvalidAction = phase.actions.some(action => 
      !action.title_template?.trim() || !action.definition?.trim()
    )
    if (hasInvalidAction) {
        toast.error(`第 ${i + 1} 个阶段有未完成的行动`)
      return
    }
    }

    try {
      // 支持多阶段创建
      const phases = newTemplate.phases.map((phase, phaseIndex) => ({
        name: phase.name,
        description: phase.description || null,
        actions: phase.actions.map((action, index) => ({
        title_template: action.title_template,
        definition: action.definition,
        estimated_time: action.estimated_time ? parseInt(action.estimated_time) : null,
        order_index: index,
        })),
      }))

      // 如果有自定义分类名称，将其添加到描述中
      let finalDescription = newTemplate.description || ''
      if (newTemplate.category === 'custom' && customCategoryName.trim()) {
        const categoryTag = `[分类: ${customCategoryName.trim()}]`
        finalDescription = finalDescription 
          ? `${categoryTag} ${finalDescription}`
          : categoryTag
        console.log('保存自定义分类名称:', customCategoryName, '最终描述:', finalDescription)
      }

      const response = await fetch('/api/goal-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newTemplate.category,
          name: newTemplate.name,
          description: finalDescription || null,
          phases, // 多阶段支持
        }),
      })

      const result = await handleApiResponse<{ data: GoalTemplate }>(response, '创建模板失败')
      
      if (result.success && result.data) {
        toast.success('模板创建成功')
        setShowCreateDialog(false)
        setNewTemplate({
          category: 'custom',
          name: '',
          description: '',
          phases: [{ name: '', description: '', actions: [] }],
        })
        setCustomCategoryName('')
        loadTemplates(true)
        // 注意：创建模板成功后不自动调用 onSelect，避免重复提示
        // onSelect 应该只在用户主动点击模板卡片时调用
      } else {
        console.error('创建模板失败:', result)
      }
    } catch (error) {
      console.error('Error creating template:', error)
    }
  }

  // 编辑模板（支持多阶段）
  const handleEditTemplate = (template: GoalTemplate) => {
    if (template.is_system) {
      toast.error('系统模板不能编辑')
      return
    }
    
    // 从描述中提取自定义分类名称
    let extractedCustomCategory = ''
    let cleanDescription = template.description || ''
    if (template.category === 'custom' && template.description) {
      const match = template.description.match(/\[分类:\s*([^\]]+)\]/)
      if (match) {
        extractedCustomCategory = match[1].trim()
        cleanDescription = template.description.replace(/\[分类:\s*[^\]]+\]\s*/, '').trim()
      }
    }
    setCustomCategoryName(extractedCustomCategory)
    
    // 支持多阶段模板
    const templateWithPhases = template as any
    if (templateWithPhases.phases && Array.isArray(templateWithPhases.phases) && templateWithPhases.phases.length > 0) {
      // 多阶段模板
    setEditingTemplate({
      ...template,
        description: cleanDescription,
        phases: templateWithPhases.phases.map((phase: any) => ({
          id: phase.id,
          name: phase.name,
          description: phase.description || '',
          actions: (phase.actions || []).map((action: any) => ({
            title_template: action.title_template,
            definition: action.definition,
            estimated_time: action.estimated_time?.toString() || '',
          })),
        })),
      } as any)
    } else {
      // 单阶段模板（向后兼容）
      setEditingTemplate({
        ...template,
        description: cleanDescription,
      phases: [{
        name: template.phase_name,
        description: template.phase_description || '',
        actions: (template.actions || []).map(action => ({
          title_template: action.title_template,
          definition: action.definition,
          estimated_time: action.estimated_time?.toString() || '',
        })),
      }],
    } as any)
    }
    setShowEditDialog(true)
  }

  // 保存编辑（支持多阶段）
  const handleSaveEdit = async () => {
    if (!editingTemplate) return

    // 验证所有阶段
    const phases = (editingTemplate as any).phases || []
    if (phases.length === 0) {
      toast.error('至少需要一个阶段')
      return
    }

    // 验证每个阶段
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i]
      if (!phase.name?.trim()) {
        toast.error(`请填写第 ${i + 1} 个阶段的名称`)
      return
    }
      if (!phase.actions || phase.actions.length === 0) {
        toast.error(`第 ${i + 1} 个阶段至少需要一个行动`)
        return
      }
    // 验证所有行动
      const hasInvalidAction = phase.actions.some((action: any) => 
      !action.title_template?.trim() || !action.definition?.trim()
    )
    if (hasInvalidAction) {
        toast.error(`第 ${i + 1} 个阶段有未完成的行动`)
      return
    }
    }

    try {
      // 支持多阶段更新
      const phasesToUpdate = phases.map((phase: any) => ({
        id: phase.id, // 如果存在，则更新；否则创建新阶段
        name: phase.name,
        description: phase.description || null,
        actions: phase.actions.map((action: any, index: number) => ({
        title_template: action.title_template,
        definition: action.definition,
        estimated_time: action.estimated_time ? parseInt(action.estimated_time) : null,
        order_index: index,
        })),
      }))

      // 如果有自定义分类名称，将其添加到描述中
      let finalDescription = editingTemplate.description || ''
      if (editingTemplate.category === 'custom' && customCategoryName.trim()) {
        const categoryTag = `[分类: ${customCategoryName.trim()}]`
        // 移除旧的分类标签（如果存在）
        finalDescription = finalDescription.replace(/\[分类:\s*[^\]]+\]\s*/, '').trim()
        finalDescription = finalDescription 
          ? `${categoryTag} ${finalDescription}`
          : categoryTag
      } else if (editingTemplate.category === 'custom' && !customCategoryName.trim()) {
        // 如果切换到自定义但没有输入名称，移除旧的分类标签
        finalDescription = finalDescription.replace(/\[分类:\s*[^\]]+\]\s*/, '').trim()
      }

      const response = await fetch(`/api/goal-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTemplate.name,
          description: finalDescription || null,
          category: editingTemplate.category,
          phases: phasesToUpdate, // 多阶段支持
        }),
      })

      const result = await handleApiResponse<{ data: GoalTemplate }>(response, '更新模板失败')
      
      if (result.success) {
        toast.success('模板更新成功')
        setShowEditDialog(false)
        setEditingTemplate(null)
        setCustomCategoryName('')
        loadTemplates(true)
      }
    } catch (error) {
      console.error('Error updating template:', error)
    }
  }

  // 打开删除确认对话框
  const handleDeleteClick = (template: GoalTemplate) => {
    setDeletingTemplate(template)
    setShowDeleteDialog(true)
  }

  // 确认删除模板（允许删除系统模板）
  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return

    setIsDeleting(true)
    const templateId = deletingTemplate.id
    const templateName = deletingTemplate.name
    
    try {
      const response = await fetch(`/api/goal-templates/${templateId}`, {
        method: 'DELETE',
      })

      // 先检查响应状态
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // 如果是 404，可能是模板已经被删除
        if (response.status === 404) {
          // 从本地状态移除
          setTemplates(prevTemplates => 
            prevTemplates.filter(t => t.id !== templateId)
          )
          toast.success('模板已删除', {
            description: '模板可能已被删除',
            duration: 3000,
          })
          setShowDeleteDialog(false)
          setDeletingTemplate(null)
          setTimeout(() => loadTemplates(true), 100)
          return
        }
        
        // 其他错误，使用 handleApiResponse 处理
        const result = await handleApiResponse(response, '删除模板失败')
        if (!result.success) {
          // 错误已由 handleApiResponse 显示
          console.error('Failed to delete template:', result.error)
          // 重置状态，确保UI正常显示
          setIsDeleting(false)
          // 保持对话框打开，让用户看到错误
          return
        }
      }

      // 解析成功响应
      const result = await handleApiResponse(response, '删除模板失败')
      
      if (result.success) {
        // 立即从本地状态中移除已删除的模板
        setTemplates(prevTemplates => 
          prevTemplates.filter(t => t.id !== templateId)
        )
        
        toast.success('模板已删除', {
          description: deletingTemplate.is_system 
            ? '系统模板已删除，可以重新初始化获取最新版本' 
            : `模板"${templateName}"已成功删除`,
          duration: 4000,
        })
        
        setShowDeleteDialog(false)
        setDeletingTemplate(null)
        
        // 强制刷新列表，确保获取最新数据
        // 立即刷新，使用强制刷新标志
        setTimeout(() => {
          console.log('Refreshing templates after deletion (forced)')
          loadTemplates(true)
        }, 100)
      } else {
        // 删除失败，保持对话框打开
        console.error('Failed to delete template:', result.error)
        // 错误已由 handleApiResponse 显示
        // 注意：状态会在 finally 块中重置，这里不需要手动重置
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('删除模板时发生错误', {
        description: error instanceof Error ? error.message : '请刷新页面后重试',
        duration: 5000,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // 添加阶段（支持多阶段）
  const addPhase = () => {
    setNewTemplate({
      ...newTemplate,
      phases: [...newTemplate.phases, { name: '', description: '', actions: [] }],
    })
  }

  // 删除阶段
  const removePhase = (phaseIndex: number) => {
    if (newTemplate.phases.length <= 1) {
      toast.error('至少需要保留一个阶段')
      return
    }
    setNewTemplate({
      ...newTemplate,
      phases: newTemplate.phases.filter((_, i) => i !== phaseIndex),
    })
  }

  // 移动阶段顺序
  const movePhase = (phaseIndex: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && phaseIndex === 0) ||
      (direction === 'down' && phaseIndex === newTemplate.phases.length - 1)
    ) {
      return
    }
    const newPhases = [...newTemplate.phases]
    const targetIndex = direction === 'up' ? phaseIndex - 1 : phaseIndex + 1
    ;[newPhases[phaseIndex], newPhases[targetIndex]] = [newPhases[targetIndex], newPhases[phaseIndex]]
    setNewTemplate({ ...newTemplate, phases: newPhases })
  }

  // 添加行动
  const addAction = (phaseIndex: number) => {
    const newPhases = [...newTemplate.phases]
    newPhases[phaseIndex].actions.push({ title_template: '', definition: '', estimated_time: '' })
    setNewTemplate({ ...newTemplate, phases: newPhases })
  }

  // 删除行动
  const removeAction = (phaseIndex: number, actionIndex: number) => {
    const newPhases = [...newTemplate.phases]
    newPhases[phaseIndex].actions = newPhases[phaseIndex].actions.filter((_, i) => i !== actionIndex)
    setNewTemplate({ ...newTemplate, phases: newPhases })
  }

  // 移动行动顺序
  const moveAction = (phaseIndex: number, actionIndex: number, direction: 'up' | 'down') => {
    const phase = newTemplate.phases[phaseIndex]
    if (
      (direction === 'up' && actionIndex === 0) ||
      (direction === 'down' && actionIndex === phase.actions.length - 1)
    ) {
      return
    }
    const newPhases = [...newTemplate.phases]
    const newActions = [...newPhases[phaseIndex].actions]
    const targetIndex = direction === 'up' ? actionIndex - 1 : actionIndex + 1
    ;[newActions[actionIndex], newActions[targetIndex]] = [newActions[targetIndex], newActions[actionIndex]]
    newPhases[phaseIndex].actions = newActions
    setNewTemplate({ ...newTemplate, phases: newPhases })
  }

  // 使用 useMemo 优化过滤性能
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      // 分类筛选：选择模式下使用 selectCategory，否则使用 category
      const currentCategory = selectMode && selectCategory ? selectCategory : category
      const categoryMatch = currentCategory === 'all' || t.category === currentCategory
    
    // 搜索筛选
    if (!searchQuery.trim()) return categoryMatch
      const query = searchQuery.toLowerCase().trim()
      
      // 提取自定义分类名称（如果存在）
      let customCategoryName = ''
      if (t.category === 'custom' && t.description) {
        const match = t.description.match(/\[分类:\s*([^\]]+)\]/)
        if (match) {
          customCategoryName = match[1].trim().toLowerCase()
        }
      }
      
      // 检查是否匹配
      const matchesName = t.name.toLowerCase().includes(query)
      const matchesPhaseName = t.phase_name?.toLowerCase().includes(query) || false
      const matchesDescription = t.description?.toLowerCase().includes(query) || false
      const matchesPhaseDescription = t.phase_description?.toLowerCase().includes(query) || false
      const matchesCustomCategory = customCategoryName.includes(query)
      
      // 检查多阶段的名称和描述
      const matchesPhases = (t as any).phases && Array.isArray((t as any).phases) && (t as any).phases.some((phase: any) => 
        phase.name?.toLowerCase().includes(query) || 
        phase.description?.toLowerCase().includes(query) ||
        (phase.actions && phase.actions.some((action: any) => 
          action.title_template?.toLowerCase().includes(query) ||
          action.definition?.toLowerCase().includes(query)
        ))
      )
      
      // 检查单阶段的行动
      const matchesActions = t.actions && t.actions.some(a => 
        a.title_template?.toLowerCase().includes(query) ||
        a.definition?.toLowerCase().includes(query)
      )
      
      return categoryMatch && (
        matchesName ||
        matchesPhaseName ||
        matchesDescription ||
        matchesPhaseDescription ||
        matchesCustomCategory ||
        matchesPhases ||
        matchesActions
      )
    })
  }, [templates, category, selectMode, selectCategory, searchQuery])

  // 选择模式：简化UI，只显示搜索
  if (selectMode) {
    return (
      <div className="space-y-4">
        {/* 选择模式：只显示搜索 */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <Input
              type="text"
              placeholder="搜索模板名称、阶段或行动内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                title="清除搜索"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground">
              找到 {filteredTemplates.length} 个匹配的模板
            </p>
          )}
        </div>

        {/* 模板列表 */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Target className="w-12 h-12 mx-auto opacity-30" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? `未找到匹配"${searchQuery}"的模板` : '当前类别下没有模板'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTemplates.map((template) => {
              // 从描述中提取自定义分类名称
              let customCategoryName = ''
              if (template.category === 'custom' && template.description) {
                const match = template.description.match(/\[分类:\s*([^\]]+)\]/)
                if (match) {
                  customCategoryName = match[1].trim()
                }
              }
              
              const categoryInfo = {
                health: { name: '健康', icon: '💪', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
                learning: { name: '学习', icon: '📚', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
                project: { name: '项目', icon: '🚀', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
                custom: { 
                  name: customCategoryName || '自定义', 
                  icon: '✨', 
                  color: 'text-gray-600 dark:text-gray-400', 
                  bg: 'bg-gray-50 dark:bg-gray-900/20', 
                  border: 'border-gray-200 dark:border-gray-800' 
                },
              }[template.category]

              return (
                <Card 
                  key={template.id} 
                  className={`${template.is_system ? 'border-primary/30 shadow-md' : 'border-2'} hover:shadow-lg hover:border-primary/40 transition-all duration-200 cursor-pointer`}
                  onClick={() => onSelect?.(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {template.is_system && <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />}
                          <CardTitle className="text-lg font-bold">{template.name}</CardTitle>
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${categoryInfo.bg} ${categoryInfo.color} border ${categoryInfo.border}`}>
                          <span>{categoryInfo.icon}</span>
                          <span>{categoryInfo.name}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* 多阶段显示 */}
                      {(template as any).phases && Array.isArray((template as any).phases) && (template as any).phases.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-foreground">阶段 ({(template as any).phases.length} 个)</p>
                          </div>
                          {(template as any).phases.slice(0, 2).map((phase: any, phaseIdx: number) => (
                            <div key={phaseIdx} className="border rounded-md p-2 bg-muted/20">
                              <p className="text-xs font-semibold text-foreground mb-1">
                                {phaseIdx + 1}. {phase.name}
                              </p>
                              {phase.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                  {phase.description}
                                </p>
                              )}
                              {phase.actions && phase.actions.length > 0 && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {phase.actions.length} 个行动模板
                                  </p>
                                  <div className="space-y-1">
                                    {phase.actions.slice(0, 2).map((action: any, actionIdx: number) => (
                                      <div key={actionIdx} className="text-xs text-muted-foreground truncate">
                                        • {action.title_template.replace('{n}', '1')}
                                      </div>
                                    ))}
                                    {phase.actions.length > 2 && (
                                      <p className="text-xs text-muted-foreground">
                                        还有 {phase.actions.length - 2} 个...
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {(template as any).phases.length > 2 && (
                            <p className="text-xs text-muted-foreground text-center">
                              还有 {(template as any).phases.length - 2} 个阶段...
                            </p>
                          )}
                        </div>
                      ) : (
                        /* 向后兼容：单阶段显示 */
                        <>
                          <div>
                            <p className="text-sm font-semibold text-foreground mb-1">阶段：{template.phase_name}</p>
                            {template.phase_description && (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {template.phase_description}
                              </p>
                            )}
                          </div>
                          {template.actions && template.actions.length > 0 && (
                            <div className="pt-3 border-t">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-foreground">行动模板</p>
                                <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">{template.actions.length} 个</span>
                              </div>
                              <div className="space-y-2">
                                {template.actions.slice(0, 3).map((action, idx) => (
                                  <div key={idx} className="flex items-start gap-2 p-2 bg-muted/30 rounded-md">
                                    <span className="text-muted-foreground mt-0.5 flex-shrink-0">•</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm mb-1">{action.title_template.replace('{n}', '1')}</p>
                                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{action.definition}</p>
                                    </div>
                                  </div>
                                ))}
                                {template.actions.length > 3 && (
                                  <p className="text-xs text-muted-foreground text-center py-1">
                                    还有 {template.actions.length - 3} 个行动模板...
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      <div className="pt-2 border-t space-y-2" suppressHydrationWarning>
                        {quickCreate && onQuickCreate ? (
                          <div className="w-full">
                            {isMounted ? (
                              <Button
                                className="w-full"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onQuickCreate(template)
                                }}
                              >
                                <Target className="w-4 h-4 mr-2" />
                                使用此模板创建目标
                              </Button>
                            ) : (
                              <div className="w-full h-9 flex items-center justify-center text-xs text-muted-foreground bg-muted rounded-md">
                                加载中...
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center">
                            点击卡片选择此模板
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // 管理模式：完整功能
  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={category} onValueChange={(v) => setCategory(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="选择分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            <SelectItem value="health">健康</SelectItem>
            <SelectItem value="learning">学习</SelectItem>
            <SelectItem value="project">项目</SelectItem>
            <SelectItem value="custom">自定义</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索模板..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          {/* 只有在"全部分类"视图下，且所有模板数量为0时，才显示初始化按钮 */}
          {category === 'all' && templates.length === 0 && (
            <Button
              variant="outline"
              onClick={() => setShowInitDialog(true)}
              disabled={isInitializing}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isInitializing ? '初始化中...' : '初始化默认模板'}
            </Button>
          )}
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            创建模板
          </Button>
        </div>
      </div>

      {/* 模板列表 */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <Target className="w-16 h-16 mx-auto opacity-30" />
          <div className="space-y-2">
            <p className="text-lg font-medium">暂无模板</p>
            <p className="text-sm text-muted-foreground">
              {templates.length === 0 
                ? (category === 'all' 
                ? '创建你的第一个目标模板，或初始化系统默认模板' 
                    : '当前分类下没有模板，可以创建新模板')
                : searchQuery 
                ? `未找到匹配"${searchQuery}"的模板`
                : '当前分类下没有模板'}
            </p>
          </div>
          {/* 只有在"全部分类"视图下，且所有模板数量为0时，才显示初始化按钮 */}
          {category === 'all' && templates.length === 0 && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
              <Button
                onClick={() => setShowInitDialog(true)}
                disabled={isInitializing}
                variant="default"
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isInitializing ? '初始化中...' : '初始化默认模板（3个）'}
              </Button>
              <Button
                onClick={() => setShowCreateDialog(true)}
                variant="outline"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                手动创建模板
              </Button>
            </div>
          )}
          {/* 在特定分类下，只显示创建模板按钮 */}
          {category !== 'all' && templates.length === 0 && (
            <div className="flex justify-center items-center pt-4">
              <Button
                onClick={() => setShowCreateDialog(true)}
                variant="default"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                创建模板
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredTemplates.map((template) => {
            // 从描述中提取自定义分类名称
            let customCategoryName = ''
            if (template.category === 'custom' && template.description) {
              const match = template.description.match(/\[分类:\s*([^\]]+)\]/)
              if (match) {
                customCategoryName = match[1].trim()
              }
            }
            
            const categoryInfo = {
              health: { name: '健康', icon: '💪', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
              learning: { name: '学习', icon: '📚', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
              project: { name: '项目', icon: '🚀', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
              custom: { 
                name: customCategoryName || '自定义', 
                icon: '✨', 
                color: 'text-gray-600 dark:text-gray-400', 
                bg: 'bg-gray-50 dark:bg-gray-900/20', 
                border: 'border-gray-200 dark:border-gray-800' 
              },
            }[template.category]

            return (
              <Card 
                key={template.id} 
                className={`${template.is_system ? 'border-primary/30 shadow-md' : 'border-2'} hover:shadow-lg hover:border-primary/40 transition-all duration-200 ${onSelect ? 'cursor-pointer' : ''} group`}
                onClick={onSelect ? () => onSelect(template) : undefined}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {template.is_system && <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />}
                        <CardTitle className="text-lg font-bold truncate">{template.name}</CardTitle>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${categoryInfo.bg} ${categoryInfo.color} border ${categoryInfo.border}`}>
                        <span>{categoryInfo.icon}</span>
                        <span>{categoryInfo.name}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {!template.is_system && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditTemplate(template)
                          }}
                          className="h-7 w-7 p-0"
                          aria-label="编辑模板"
                          title="编辑模板"
                        >
                          <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClick(template)
                        }}
                        className={`h-7 w-7 p-0 ${template.is_system ? 'text-destructive hover:text-destructive hover:bg-destructive/10' : ''}`}
                        aria-label={template.is_system ? '删除系统模板（可重新初始化）' : '删除模板'}
                        title={template.is_system ? '删除系统模板（可重新初始化）' : '删除模板'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* 多阶段显示 */}
                    {(template as any).phases && Array.isArray((template as any).phases) && (template as any).phases.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-foreground">阶段 ({(template as any).phases.length} 个)</p>
                        </div>
                        {(template as any).phases.slice(0, 2).map((phase: any, phaseIdx: number) => (
                          <div key={phaseIdx} className="border rounded-md p-2 bg-muted/20">
                            <p className="text-xs font-semibold text-foreground mb-1">
                              {phaseIdx + 1}. {phase.name}
                            </p>
                            {phase.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                {phase.description}
                              </p>
                            )}
                            {phase.actions && phase.actions.length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {phase.actions.length} 个行动模板
                                </p>
                                <div className="space-y-1">
                                  {phase.actions.slice(0, 2).map((action: any, actionIdx: number) => (
                                    <div key={actionIdx} className="text-xs text-muted-foreground truncate">
                                      • {action.title_template.replace('{n}', '1')}
                                    </div>
                                  ))}
                                  {phase.actions.length > 2 && (
                                    <p className="text-xs text-muted-foreground">
                                      还有 {phase.actions.length - 2} 个...
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {(template as any).phases.length > 2 && (
                          <p className="text-xs text-muted-foreground text-center">
                            还有 {(template as any).phases.length - 2} 个阶段...
                          </p>
                        )}
                      </div>
                    ) : (
                      /* 向后兼容：单阶段显示 */
                      <>
                    <div>
                          <p className="text-sm font-semibold text-foreground mb-1">阶段：{template.phase_name}</p>
                      {template.phase_description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {template.phase_description}
                        </p>
                      )}
                    </div>
                    {template.actions && template.actions.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-foreground">行动模板</p>
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{template.actions.length} 个</span>
                        </div>
                        <div className="space-y-1.5">
                          {template.actions.slice(0, 2).map((action, idx) => (
                                <div key={idx} className="flex items-start gap-2 p-1.5 bg-muted/30 rounded text-xs">
                                  <span className="text-muted-foreground mt-0.5 flex-shrink-0">•</span>
                              <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate mb-0.5">{action.title_template.replace('{n}', '1')}</p>
                                <p className="text-muted-foreground line-clamp-1">{action.definition}</p>
                              </div>
                            </div>
                          ))}
                          {template.actions.length > 2 && (
                                <p className="text-xs text-muted-foreground text-center py-0.5">
                              还有 {template.actions.length - 2} 个行动模板...
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                      </>
                    )}
                    <div className="pt-2 border-t space-y-2" suppressHydrationWarning>
                      {quickCreate && onQuickCreate ? (
                        <div className="w-full">
                          {isMounted ? (
                      <Button
                              className="w-full"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                                onQuickCreate(template)
                        }}
                      >
                        <Target className="w-4 h-4 mr-2" />
                              使用此模板创建目标
                      </Button>
                          ) : (
                            <div className="w-full h-9 flex items-center justify-center text-xs text-muted-foreground bg-muted rounded-md">
                              加载中...
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center">
                          {onSelect ? '点击卡片选择此模板' : '点击卡片查看详情'}
                        </p>
                    )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 创建对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open)
        if (!open) {
          // 关闭对话框时重置状态
          setCustomCategoryName('')
          setNewTemplate({
            category: 'custom',
            name: '',
            description: '',
            phases: [{ name: '', description: '', actions: [] }],
          })
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建目标模板</DialogTitle>
            <DialogDescription>
              创建一个新的目标模板，用于快速创建目标
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>分类</Label>
              <Select
                value={newTemplate.category}
                onValueChange={(v) => {
                  setNewTemplate({ ...newTemplate, category: v as any })
                  if (v !== 'custom') {
                    setCustomCategoryName('')
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">健康</SelectItem>
                  <SelectItem value="learning">学习</SelectItem>
                  <SelectItem value="project">项目</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
              {newTemplate.category === 'custom' && (
                <div>
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
            <div>
              <Label>模板名称</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="例如：健身目标模板"
              />
            </div>
            <div>
              <Label>模板描述（可选）</Label>
              <Textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="描述这个模板的用途"
                rows={2}
              />
            </div>

            {/* 阶段管理 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Label>阶段管理</Label>
                  <span className="text-xs text-muted-foreground">（支持多阶段）</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addPhase}
                  title="添加新阶段"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加阶段
                </Button>
              </div>
              <div className="space-y-4">
                {newTemplate.phases.map((phase, phaseIndex) => (
                  <Card key={phaseIndex} className="p-4 border-2">
                    <div className="space-y-3">
                      {/* 阶段头部 */}
                      <div className="flex items-start gap-2">
                        <div className="flex items-center gap-1 mt-1">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-semibold text-muted-foreground">
                            阶段 {phaseIndex + 1}
                          </span>
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            value={phase.name}
                            onChange={(e) => {
                              const newPhases = [...newTemplate.phases]
                              newPhases[phaseIndex].name = e.target.value
                              setNewTemplate({ ...newTemplate, phases: newPhases })
                            }}
                            placeholder="阶段名称（例如：基础训练阶段）"
                          />
                          <Textarea
                            value={phase.description}
                            onChange={(e) => {
                              const newPhases = [...newTemplate.phases]
                              newPhases[phaseIndex].description = e.target.value
                              setNewTemplate({ ...newTemplate, phases: newPhases })
                            }}
                            placeholder="阶段描述（可选）"
                            rows={2}
                          />
                        </div>
                        <div className="flex flex-col gap-1 border-l pl-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-muted"
                            onClick={() => movePhase(phaseIndex, 'up')}
                            disabled={phaseIndex === 0}
                            aria-label="上移阶段"
                            title="上移阶段"
                          >
                            <ChevronUp className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-muted"
                            onClick={() => movePhase(phaseIndex, 'down')}
                            disabled={phaseIndex === newTemplate.phases.length - 1}
                            aria-label="下移阶段"
                            title="下移阶段"
                          >
                            <ChevronDown className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => removePhase(phaseIndex)}
                            disabled={newTemplate.phases.length <= 1}
                            title="至少需要保留一个阶段"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* 行动列表 */}
                      <div className="pl-6 border-l-2 border-muted">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm">行动模板</Label>
                          <Button variant="outline" size="sm" onClick={() => addAction(phaseIndex)}>
                            <Plus className="w-3 h-3 mr-1" />
                            添加行动
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {phase.actions.map((action, actionIndex) => (
                            <Card key={actionIndex} className="p-3 bg-muted/30">
                              <div className="flex items-start gap-2">
                                <div className="flex flex-col gap-1 mt-1 border-r pr-2 mr-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-muted"
                                    onClick={() => moveAction(phaseIndex, actionIndex, 'up')}
                                    disabled={actionIndex === 0}
                                    aria-label="上移行动"
                                    title="上移行动"
                                  >
                                    <ChevronUp className="w-3 h-3" aria-hidden="true" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-muted"
                                    onClick={() => moveAction(phaseIndex, actionIndex, 'down')}
                                    disabled={actionIndex === phase.actions.length - 1}
                                    aria-label="下移行动"
                                    title="下移行动"
                                  >
                                    <ChevronDown className="w-3 h-3" aria-hidden="true" />
                                  </Button>
                                </div>
                                <div className="flex-1 space-y-2">
                                  <Input
                                    value={action.title_template}
                                    onChange={(e) => {
                                      const newPhases = [...newTemplate.phases]
                                      newPhases[phaseIndex].actions[actionIndex].title_template = e.target.value
                                      setNewTemplate({ ...newTemplate, phases: newPhases })
                                    }}
                                    placeholder="行动标题模板（可使用 {n} 占位符）*"
                                  />
                                  <Textarea
                                    value={action.definition}
                                    onChange={(e) => {
                                      const newPhases = [...newTemplate.phases]
                                      newPhases[phaseIndex].actions[actionIndex].definition = e.target.value
                                      setNewTemplate({ ...newTemplate, phases: newPhases })
                                    }}
                                    placeholder="行动定义 *"
                                    rows={2}
                                  />
                                  <Input
                                    type="number"
                                    value={action.estimated_time}
                                    onChange={(e) => {
                                      const newPhases = [...newTemplate.phases]
                                      newPhases[phaseIndex].actions[actionIndex].estimated_time = e.target.value
                                      setNewTemplate({ ...newTemplate, phases: newPhases })
                                    }}
                                    placeholder="预计时间（分钟，可选）"
                                    min="1"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                  onClick={() => removeAction(phaseIndex, actionIndex)}
                                  title="删除行动"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                          {phase.actions.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              暂无行动，点击&ldquo;添加行动&rdquo;开始
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false)
              setCustomCategoryName('')
              setNewTemplate({
                category: 'custom',
                name: '',
                description: '',
                phases: [{ name: '', description: '', actions: [] }],
              })
            }}>
              取消
            </Button>
            <Button onClick={handleCreateTemplate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑目标模板</DialogTitle>
            <DialogDescription>
              修改模板内容
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>分类</Label>
                <Select
                  value={editingTemplate.category}
                  onValueChange={(v) => {
                    setEditingTemplate({ ...editingTemplate, category: v as any })
                    if (v !== 'custom') {
                      setCustomCategoryName('')
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="health">健康</SelectItem>
                    <SelectItem value="learning">学习</SelectItem>
                    <SelectItem value="project">项目</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
                {editingTemplate.category === 'custom' && (
                  <div>
                    <Label htmlFor="edit-custom-category-name" className="text-sm text-muted-foreground">
                      自定义分类名称（可选）
                    </Label>
                    <Input
                      id="edit-custom-category-name"
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
              <div>
                <Label>模板名称</Label>
                <Input
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                />
              </div>
              <div>
                <Label>模板描述</Label>
                <Textarea
                  value={editingTemplate.description || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  rows={2}
                />
              </div>

              {/* 阶段管理（编辑模式） */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>阶段管理</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const phases = (editingTemplate as any).phases || []
                      setEditingTemplate({
                        ...editingTemplate,
                        phases: [...phases, { name: '', description: '', actions: [] }],
                      } as any)
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加阶段
                  </Button>
                </div>
                <div className="space-y-4">
                  {((editingTemplate as any).phases || []).map((phase: PhaseTemplate, phaseIndex: number) => (
                    <Card key={phaseIndex} className="p-4 border-2">
                      <div className="space-y-3">
                        {/* 阶段头部 */}
                        <div className="flex items-start gap-2">
                          <div className="flex items-center gap-1 mt-1">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-semibold text-muted-foreground">
                              阶段 {phaseIndex + 1}
                            </span>
                          </div>
                          <div className="flex-1 space-y-2">
                            <Input
                              value={phase.name}
                              onChange={(e) => {
                                const phases = [...((editingTemplate as any).phases || [])]
                                phases[phaseIndex].name = e.target.value
                                setEditingTemplate({ ...editingTemplate, phases } as any)
                              }}
                              placeholder="阶段名称（例如：基础训练阶段）"
                            />
                            <Textarea
                              value={phase.description}
                              onChange={(e) => {
                                const phases = [...((editingTemplate as any).phases || [])]
                                phases[phaseIndex].description = e.target.value
                                setEditingTemplate({ ...editingTemplate, phases } as any)
                              }}
                              placeholder="阶段描述（可选）"
                              rows={2}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                const phases = [...((editingTemplate as any).phases || [])]
                                if (phaseIndex > 0) {
                                  [phases[phaseIndex], phases[phaseIndex - 1]] = [phases[phaseIndex - 1], phases[phaseIndex]]
                                  setEditingTemplate({ ...editingTemplate, phases } as any)
                                }
                              }}
                              disabled={phaseIndex === 0}
                              aria-label="上移阶段"
                              title="上移阶段"
                            >
                              <ChevronUp className="w-4 h-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                const phases = [...((editingTemplate as any).phases || [])]
                                if (phaseIndex < phases.length - 1) {
                                  [phases[phaseIndex], phases[phaseIndex + 1]] = [phases[phaseIndex + 1], phases[phaseIndex]]
                                  setEditingTemplate({ ...editingTemplate, phases } as any)
                                }
                              }}
                              disabled={phaseIndex === ((editingTemplate as any).phases || []).length - 1}
                              aria-label="下移阶段"
                              title="下移阶段"
                            >
                              <ChevronDown className="w-4 h-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => {
                                const phases = ((editingTemplate as any).phases || []).filter((_: any, i: number) => i !== phaseIndex)
                                if (phases.length === 0) {
                                  toast.error('至少需要保留一个阶段')
                                  return
                                }
                                setEditingTemplate({ ...editingTemplate, phases } as any)
                              }}
                              disabled={((editingTemplate as any).phases || []).length <= 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* 行动列表 */}
                        <div className="pl-6 border-l-2 border-muted">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm">行动模板</Label>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                const phases = [...((editingTemplate as any).phases || [])]
                                phases[phaseIndex].actions.push({ title_template: '', definition: '', estimated_time: '' })
                                setEditingTemplate({ ...editingTemplate, phases } as any)
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              添加行动
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {phase.actions.map((action, actionIndex) => (
                              <Card key={actionIndex} className="p-3 bg-muted/30">
                                <div className="flex items-start gap-2">
                                  <div className="flex flex-col gap-1 mt-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => {
                                        const phases = [...((editingTemplate as any).phases || [])]
                                        const actions = [...phases[phaseIndex].actions]
                                        if (actionIndex > 0) {
                                          [actions[actionIndex], actions[actionIndex - 1]] = [actions[actionIndex - 1], actions[actionIndex]]
                                          phases[phaseIndex].actions = actions
                                          setEditingTemplate({ ...editingTemplate, phases } as any)
                                        }
                                      }}
                                      disabled={actionIndex === 0}
                                      aria-label="上移行动"
                                      title="上移行动"
                                    >
                                      <ChevronUp className="w-3 h-3" aria-hidden="true" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => {
                                        const phases = [...((editingTemplate as any).phases || [])]
                                        const actions = [...phases[phaseIndex].actions]
                                        if (actionIndex < actions.length - 1) {
                                          [actions[actionIndex], actions[actionIndex + 1]] = [actions[actionIndex + 1], actions[actionIndex]]
                                          phases[phaseIndex].actions = actions
                                          setEditingTemplate({ ...editingTemplate, phases } as any)
                                        }
                                      }}
                                      disabled={actionIndex === phase.actions.length - 1}
                                      aria-label="下移行动"
                                      title="下移行动"
                                    >
                                      <ChevronDown className="w-3 h-3" aria-hidden="true" />
                                    </Button>
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <Input
                                      value={action.title_template}
                                      onChange={(e) => {
                                        const phases = [...((editingTemplate as any).phases || [])]
                                        phases[phaseIndex].actions[actionIndex].title_template = e.target.value
                                        setEditingTemplate({ ...editingTemplate, phases } as any)
                                      }}
                                      placeholder="行动标题模板（可使用 {n} 占位符）"
                                    />
                                    <Textarea
                                      value={action.definition}
                                      onChange={(e) => {
                                        const phases = [...((editingTemplate as any).phases || [])]
                                        phases[phaseIndex].actions[actionIndex].definition = e.target.value
                                        setEditingTemplate({ ...editingTemplate, phases } as any)
                                      }}
                                      placeholder="行动定义"
                                      rows={2}
                                    />
                                    <Input
                                      type="number"
                                      value={action.estimated_time}
                                      onChange={(e) => {
                                        const phases = [...((editingTemplate as any).phases || [])]
                                        phases[phaseIndex].actions[actionIndex].estimated_time = e.target.value
                                        setEditingTemplate({ ...editingTemplate, phases } as any)
                                      }}
                                      placeholder="预计时间（分钟）"
                                    />
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive"
                                    onClick={() => {
                                      const phases = [...((editingTemplate as any).phases || [])]
                                      phases[phaseIndex].actions = phases[phaseIndex].actions.filter((_: any, i: number) => i !== actionIndex)
                                      setEditingTemplate({ ...editingTemplate, phases } as any)
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </Card>
                            ))}
                            {phase.actions.length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                暂无行动，点击&ldquo;添加行动&rdquo;开始
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 初始化确认对话框 */}
      <Dialog open={showInitDialog} onOpenChange={setShowInitDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              初始化系统默认模板
            </DialogTitle>
            <DialogDescription>
              将创建 3 个系统默认目标模板，帮助你快速开始
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <span className="text-xl">💪</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">健身目标模板</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    全面健身阶段 - 包含核心训练、有氧运动、柔韧性、力量训练和恢复，共 6 个行动模板
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <span className="text-xl">📚</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">学习目标模板</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    系统学习阶段 - 包含新知识学习、复习、实践应用、知识整理、测试和拓展，共 6 个行动模板
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <span className="text-xl">🚀</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">项目目标模板</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    项目推进阶段 - 包含功能开发、复盘、测试调试、需求分析、重构和文档，共 6 个行动模板
                  </p>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground">
                💡 提示：系统模板创建后，所有用户都可以查看和使用。你可以在创建目标时选择这些模板。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInitDialog(false)}
              disabled={isInitializing}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                setShowInitDialog(false)
                await handleInitDefaults()
              }}
              disabled={isInitializing}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isInitializing ? '初始化中...' : '确认初始化'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-xl">确认删除模板</DialogTitle>
                <DialogDescription className="mt-1">
                  {deletingTemplate?.is_system ? '系统模板' : '自定义模板'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {deletingTemplate && (
              <>
                <div className="p-4 rounded-lg bg-muted/50 border-2 border-destructive/20">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {deletingTemplate.is_system && (
                        <Sparkles className="w-4 h-4 text-primary" />
                      )}
                      <p className="font-semibold text-base">{deletingTemplate.name}</p>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-medium">阶段：</span>{deletingTemplate.phase_name}</p>
                      {deletingTemplate.actions && deletingTemplate.actions.length > 0 && (
                        <p><span className="font-medium">行动模板：</span>{deletingTemplate.actions.length} 个</p>
                      )}
                    </div>
                  </div>
                </div>

                {deletingTemplate.is_system ? (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          系统模板删除提示
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                          删除后，你可以通过&ldquo;初始化默认模板&rdquo;功能重新获取最新版本的系统模板。系统模板会定期更新，重新初始化可以获得最新的内容和优化。
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-2">
                      <span className="text-base">⚠️</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                          删除后无法恢复
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                          此操作将永久删除此模板及其所有行动模板。如果此模板已被用于创建目标，已创建的目标不会受到影响。
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeletingTemplate(null)
              }}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTemplate}
              disabled={isDeleting || !deletingTemplate}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

