'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Edit2, Sparkles, Copy, Search } from 'lucide-react'
import { toast } from 'sonner'
import { handleApiResponse } from '@/lib/utils'

interface ActionTemplate {
  id: string
  category: 'health' | 'learning' | 'project' | 'custom'
  title: string
  definition: string
  estimated_time: number | null
}

interface ActionTemplateSelectorProps {
  onSelect: (template: ActionTemplate) => void
  selectedCategory?: 'health' | 'learning' | 'project' | 'custom' | null
}

/**
 * 行动模板选择器
 * 允许用户从个人模板库中选择模板
 */
export default function ActionTemplateSelector({ onSelect, selectedCategory }: ActionTemplateSelectorProps) {
  const [templates, setTemplates] = useState<ActionTemplate[]>([])
  const [category, setCategory] = useState<'health' | 'learning' | 'project' | 'custom' | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState<ActionTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ActionTemplate | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newTemplate, setNewTemplate] = useState({
    category: selectedCategory || 'custom' as 'health' | 'learning' | 'project' | 'custom',
    title: '',
    definition: '',
    estimated_time: '',
  })

  // 加载模板
  useEffect(() => {
    loadTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  const loadTemplates = async () => {
    setIsLoading(true)
    try {
      const url = category === 'all' 
        ? '/api/action-templates'
        : `/api/action-templates?category=${category}`
      
      const response = await fetch(url)
      
      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.code === 'TABLE_NOT_FOUND') {
          toast.error('模板功能未初始化，请执行数据库迁移', {
            description: '需要在 Supabase 中执行 migration_add_action_templates.sql',
            duration: 5000
          })
        } else if (errorData.code === 'PERMISSION_DENIED') {
          toast.error('没有权限访问模板，请检查 RLS 策略')
        } else {
          toast.error(errorData.error || '加载模板失败', {
            description: errorData.details || '',
            duration: 3000
          })
        }
        setIsLoading(false)
        setTemplates([])
        return
      }
      
      const result = await handleApiResponse<{ templates: ActionTemplate[] }>(response, '加载模板失败')
      
      if (result.success && result.data) {
        setTemplates(result.data.templates)
      } else {
        setTemplates([])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('加载模板失败，请刷新页面重试', {
        description: error instanceof Error ? error.message : '网络错误',
        duration: 3000
      })
      setTemplates([])
    } finally {
      setIsLoading(false)
    }
  }

  // 创建模板
  const handleCreateTemplate = async () => {
    // 验证必填字段
    if (!newTemplate.title?.trim()) {
      toast.error('请填写标题')
      return
    }
    if (!newTemplate.definition?.trim()) {
      toast.error('请填写完成标准')
      return
    }

    // 验证预计时间
    if (newTemplate.estimated_time && (parseInt(newTemplate.estimated_time) < 1 || parseInt(newTemplate.estimated_time) > 1440)) {
      toast.error('预计时间应在 1-1440 分钟之间')
      return
    }

    // 检查是否已存在同名模板
    const existingTemplate = templates.find(t => t.title === newTemplate.title.trim() && t.category === newTemplate.category)
    if (existingTemplate) {
      toast.error('模板已存在', {
        description: `分类"${newTemplate.category}"下已存在同名模板"${newTemplate.title}"`,
      })
      return
    }

    try {
      const response = await fetch('/api/action-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newTemplate.category,
          title: newTemplate.title,
          definition: newTemplate.definition,
          estimated_time: newTemplate.estimated_time ? parseInt(newTemplate.estimated_time) : null,
        }),
      })

      const result = await handleApiResponse<{ template: ActionTemplate }>(response, '创建模板失败')

      if (result.success && result.data) {
        toast.success('模板创建成功')
        setShowCreateDialog(false)
        setNewTemplate({ category: selectedCategory || 'custom', title: '', definition: '', estimated_time: '' })
        loadTemplates()
      }
    } catch (error) {
      // handleApiResponse 已处理错误
    }
  }

  // 编辑模板
  const handleEditTemplate = (template: ActionTemplate) => {
    setEditingTemplate(template)
    setNewTemplate({
      category: template.category,
      title: template.title,
      definition: template.definition,
      estimated_time: template.estimated_time?.toString() || '',
    })
    setShowEditDialog(true)
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingTemplate) return

    // 验证必填字段
    if (!newTemplate.title?.trim()) {
      toast.error('请填写标题')
      return
    }
    if (!newTemplate.definition?.trim()) {
      toast.error('请填写完成标准')
      return
    }

    // 验证预计时间
    if (newTemplate.estimated_time && (parseInt(newTemplate.estimated_time) < 1 || parseInt(newTemplate.estimated_time) > 1440)) {
      toast.error('预计时间应在 1-1440 分钟之间')
      return
    }

    // 检查是否已存在同名模板（排除当前编辑的模板）
    const existingTemplate = templates.find(t => 
      t.id !== editingTemplate.id && 
      t.title === newTemplate.title.trim() && 
      t.category === newTemplate.category
    )
    if (existingTemplate) {
      toast.error('模板已存在', {
        description: `分类"${newTemplate.category}"下已存在同名模板"${newTemplate.title}"`,
      })
      return
    }

    try {
      const response = await fetch(`/api/action-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newTemplate.category,
          title: newTemplate.title,
          definition: newTemplate.definition,
          estimated_time: newTemplate.estimated_time ? parseInt(newTemplate.estimated_time) : null,
        }),
      })

      const result = await handleApiResponse<{ template: ActionTemplate }>(response, '更新模板失败')

      if (result.success && result.data) {
        toast.success('模板已更新')
        setShowEditDialog(false)
        setEditingTemplate(null)
        setNewTemplate({ category: selectedCategory || 'custom', title: '', definition: '', estimated_time: '' })
        loadTemplates()
      }
    } catch (error) {
      // handleApiResponse 已处理错误
    }
  }

  // 复制模板
  const handleCopyTemplate = async (template: ActionTemplate) => {
    // 检查是否已存在同名模板
    const copyTitle = `${template.title} (副本)`
    const existingTemplate = templates.find(t => t.title === copyTitle)
    
    if (existingTemplate) {
      toast.error('模板已存在', {
        description: `模板"${copyTitle}"已存在，请先删除或重命名`,
      })
      return
    }

    try {
      const response = await fetch('/api/action-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: template.category,
          title: copyTitle,
          definition: template.definition,
          estimated_time: template.estimated_time,
        }),
      })

      const result = await handleApiResponse<{ template: ActionTemplate }>(response, '复制模板失败')

      if (result.success && result.data) {
        toast.success('模板已复制', {
          description: `已创建模板"${copyTitle}"`,
        })
        loadTemplates()
      }
    } catch (error) {
      // handleApiResponse 已处理错误
    }
  }

  // 打开删除确认对话框
  const handleDeleteClick = (template: ActionTemplate) => {
    setDeletingTemplate(template)
    setShowDeleteDialog(true)
  }

  // 确认删除模板
  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return

    setIsDeleting(true)
    const templateId = deletingTemplate.id
    const templateTitle = deletingTemplate.title

    try {
      const response = await fetch(`/api/action-templates/${templateId}`, {
        method: 'DELETE',
      })

      const result = await handleApiResponse(response, '删除模板失败')

      if (result.success) {
        toast.success('模板已删除', {
          description: `已删除模板"${templateTitle}"`,
        })
        setShowDeleteDialog(false)
        setDeletingTemplate(null)
        loadTemplates()
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // 初始化确认对话框状态
  const [showInitConfirmDialog, setShowInitConfirmDialog] = useState(false)

  // 初始化默认模板
  const handleInitDefaults = async () => {

    setIsInitializing(true)
    try {
      const response = await fetch('/api/action-templates/init-defaults', {
        method: 'POST',
      })

      const result = await handleApiResponse<{
        message: string
        count?: number
        skipped?: boolean
      }>(response, '初始化默认模板失败')

      if (result.success && result.data) {
        if (result.data.skipped) {
          toast.info(result.data.message || '您已有模板，跳过初始化')
        } else {
          toast.success(result.data.message || `成功创建 ${result.data.count || 0} 个默认模板`)
          loadTemplates()
        }
      }
    } catch (error) {
      // handleApiResponse 已处理错误
    } finally {
      setIsInitializing(false)
    }
  }

  const handleInitDefaultsConfirm = async () => {
    await handleInitDefaults()
  }

  const filteredTemplates = (category === 'all' 
    ? templates
    : templates.filter(t => t.category === category)
  ).filter(t => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return t.title.toLowerCase().includes(query) || 
           t.definition.toLowerCase().includes(query)
  })

  return (
    <div className="space-y-4">
      {/* 分类筛选、搜索和创建按钮 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={category} onValueChange={(v) => setCategory(v as any)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          新建模板
        </Button>
      </div>

      {/* 模板列表 */}
      {isLoading ? (
        <div className="text-center py-4 text-sm text-muted-foreground">加载中...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-6 space-y-4">
          <div className="text-sm text-muted-foreground">
            {templates.length === 0 ? (
              <>
                <p className="mb-3">还没有模板，创建一个开始吧</p>
                <Button
                  onClick={() => setShowInitConfirmDialog(true)}
                  disabled={isInitializing}
                  variant="default"
                  size="sm"
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isInitializing ? '正在创建...' : '初始化默认模板（16个）'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  或点击上方&ldquo;新建模板&rdquo;手动创建
                </p>
              </>
            ) : searchQuery ? (
              <p>未找到匹配&ldquo;{searchQuery}&rdquo;的模板</p>
            ) : (
              <p>当前分类下没有模板</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:bg-muted/50 hover:border-primary/20 transition-all duration-200"
              onClick={() => onSelect(template)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">{template.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {template.definition}
                    </div>
                    {template.estimated_time && (
                      <div className="text-xs text-muted-foreground mt-1">
                        预计时间：{template.estimated_time} 分钟
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyTemplate(template)
                      }}
                      title="复制模板"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditTemplate(template)
                      }}
                      title="编辑模板"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClick(template)
                      }}
                      title="删除模板"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 创建模板对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建行动模板</DialogTitle>
            <DialogDescription>
              保存常用行动，快速创建。每个模板应该是一个独立的、可在一天内完成的行动。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-category">类别</Label>
              <Select
                value={newTemplate.category}
                onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v as any })}
              >
                <SelectTrigger id="create-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">健康</SelectItem>
                  <SelectItem value="learning">学习</SelectItem>
                  <SelectItem value="project">项目</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-title">标题 *</Label>
              <Input
                id="create-title"
                value={newTemplate.title}
                onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                placeholder="例如：核心训练"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-definition">完成标准 *</Label>
              <Textarea
                id="create-definition"
                value={newTemplate.definition}
                onChange={(e) => setNewTemplate({ ...newTemplate, definition: e.target.value })}
                placeholder="例如：完成3组，每组10次"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-time">预计时间（分钟，可选）</Label>
              <Input
                id="create-time"
                type="number"
                value={newTemplate.estimated_time}
                onChange={(e) => setNewTemplate({ ...newTemplate, estimated_time: e.target.value })}
                placeholder="例如：30"
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
              <Button
              variant="outline"
                onClick={() => {
                  setShowCreateDialog(false)
                  setNewTemplate({ category: selectedCategory || 'custom', title: '', definition: '', estimated_time: '' })
                }}
              >
                取消
              </Button>
            <Button
              onClick={handleCreateTemplate}
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑模板对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑行动模板</DialogTitle>
            <DialogDescription>
              修改模板内容，确保每个模板是一个独立的、可在一天内完成的行动。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">类别</Label>
              <Select
                value={newTemplate.category}
                onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v as any })}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">健康</SelectItem>
                  <SelectItem value="learning">学习</SelectItem>
                  <SelectItem value="project">项目</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title">标题 *</Label>
              <Input
                id="edit-title"
                value={newTemplate.title}
                onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                placeholder="例如：晨间运动"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-definition">完成标准 *</Label>
              <Textarea
                id="edit-definition"
                value={newTemplate.definition}
                onChange={(e) => setNewTemplate({ ...newTemplate, definition: e.target.value })}
                placeholder="例如：完成15-30分钟的晨间运动"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time">预计时间（分钟，可选）</Label>
              <Input
                id="edit-time"
                type="number"
                value={newTemplate.estimated_time}
                onChange={(e) => setNewTemplate({ ...newTemplate, estimated_time: e.target.value })}
                placeholder="例如：20"
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
              <Button
              variant="outline"
                onClick={() => {
                  setShowEditDialog(false)
                  setEditingTemplate(null)
                  setNewTemplate({ category: selectedCategory || 'custom', title: '', definition: '', estimated_time: '' })
                }}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveEdit}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 初始化确认对话框 */}
      <Dialog open={showInitConfirmDialog} onOpenChange={setShowInitConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>初始化默认模板</DialogTitle>
            <DialogDescription>
              将创建 16 个常用行动模板，涵盖健康、学习、项目和自定义类别。如果已存在模板，将跳过初始化。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInitConfirmDialog(false)}
              disabled={isInitializing}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                setShowInitConfirmDialog(false)
                await handleInitDefaultsConfirm()
              }}
              disabled={isInitializing}
            >
              {isInitializing ? '初始化中...' : '确认初始化'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除模板</DialogTitle>
            <DialogDescription>
              确定要删除模板&ldquo;{deletingTemplate?.title}&rdquo;吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
              disabled={isDeleting}
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

