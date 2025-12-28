'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical, X } from 'lucide-react'
import { toast } from 'sonner'

interface TemplatePhaseEdit {
  name: string
  description: string
  actions: Array<{ title_template: string; definition: string; estimated_time: string; count?: string }>
}

interface TemplateEditorProps {
  template: any
  phases: TemplatePhaseEdit[]
  onPhasesChange: (phases: TemplatePhaseEdit[]) => void
  onRemoveTemplate: () => void
}

/**
 * 模板编辑器组件
 * 用于在创建目标时编辑模板内容，支持多阶段管理和排序
 */
export default function TemplateEditor({
  template,
  phases,
  onPhasesChange,
  onRemoveTemplate,
}: TemplateEditorProps) {
  // 确保 phases 不为空
  if (!phases || phases.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        模板数据加载中...
      </div>
    )
  }
  // 添加阶段
  const addPhase = () => {
    onPhasesChange([...phases, { name: '', description: '', actions: [] }])
  }

  // 删除阶段
  const removePhase = (phaseIndex: number) => {
    if (phases.length <= 1) {
      toast.error('至少需要保留一个阶段')
      return
    }
    onPhasesChange(phases.filter((_, i) => i !== phaseIndex))
  }

  // 移动阶段顺序
  const movePhase = (phaseIndex: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && phaseIndex === 0) ||
      (direction === 'down' && phaseIndex === phases.length - 1)
    ) {
      return
    }
    const newPhases = [...phases]
    const targetIndex = direction === 'up' ? phaseIndex - 1 : phaseIndex + 1
    ;[newPhases[phaseIndex], newPhases[targetIndex]] = [newPhases[targetIndex], newPhases[phaseIndex]]
    onPhasesChange(newPhases)
  }

  // 添加行动
  const addAction = (phaseIndex: number) => {
    const newPhases = [...phases]
    newPhases[phaseIndex].actions.push({ title_template: '', definition: '', estimated_time: '', count: '7' })
    onPhasesChange(newPhases)
  }

  // 删除行动
  const removeAction = (phaseIndex: number, actionIndex: number) => {
    const newPhases = [...phases]
    newPhases[phaseIndex].actions = newPhases[phaseIndex].actions.filter((_, i) => i !== actionIndex)
    onPhasesChange(newPhases)
  }

  // 移动行动顺序
  const moveAction = (phaseIndex: number, actionIndex: number, direction: 'up' | 'down') => {
    const phase = phases[phaseIndex]
    if (
      (direction === 'up' && actionIndex === 0) ||
      (direction === 'down' && actionIndex === phase.actions.length - 1)
    ) {
      return
    }
    const newPhases = [...phases]
    const newActions = [...newPhases[phaseIndex].actions]
    const targetIndex = direction === 'up' ? actionIndex - 1 : actionIndex + 1
    ;[newActions[actionIndex], newActions[targetIndex]] = [newActions[targetIndex], newActions[actionIndex]]
    newPhases[phaseIndex].actions = newActions
    onPhasesChange(newPhases)
  }

  return (
    <div className="space-y-3 min-w-0">
      {/* 模板信息头部 */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium mb-1 truncate">
            已选择模板：{template.name}
          </div>
          <div className="text-xs text-muted-foreground">
            分类：{(() => {
              if (template.category === 'health') return '健康'
              if (template.category === 'learning') return '学习'
              if (template.category === 'project') return '项目'
              if (template.category === 'custom') {
                // 从描述中提取自定义分类名称
                if (template.description) {
                  const match = template.description.match(/\[分类:\s*([^\]]+)\]/)
                  if (match && match[1]) {
                    return match[1].trim()
                  }
                }
                return '自定义'
              }
              return '未分类'
            })()}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemoveTemplate}
          className="h-7 px-2 text-xs text-destructive flex-shrink-0"
        >
          <X className="w-3 h-3 mr-1" />
          取消选择
        </Button>
      </div>

      {/* 阶段管理 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold">阶段管理</Label>
          <Button variant="outline" size="sm" onClick={addPhase} className="h-7 px-2 text-xs">
            <Plus className="w-3 h-3 mr-1" />
            添加阶段
          </Button>
        </div>
        <div className="space-y-3 max-h-[400px] overflow-y-auto min-w-0">
          {phases.map((phase, phaseIndex) => (
            <Card key={phaseIndex} className="p-3 border-2 min-w-0">
              <div className="space-y-2">
                {/* 阶段头部 */}
                <div className="flex items-start gap-2 min-w-0">
                  <div className="flex items-center gap-1 mt-1 flex-shrink-0">
                    <GripVertical className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      阶段 {phaseIndex + 1}
                    </span>
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <Input
                      value={phase.name}
                      onChange={(e) => {
                        const newPhases = [...phases]
                        newPhases[phaseIndex].name = e.target.value
                        onPhasesChange(newPhases)
                      }}
                      placeholder="阶段名称"
                      className="h-7 text-xs w-full"
                    />
                    <Textarea
                      value={phase.description}
                      onChange={(e) => {
                        const newPhases = [...phases]
                        newPhases[phaseIndex].description = e.target.value
                        onPhasesChange(newPhases)
                      }}
                      placeholder="阶段描述（可选）"
                      rows={2}
                      className="text-xs w-full resize-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1 border-l pl-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-muted"
                      onClick={() => movePhase(phaseIndex, 'up')}
                      disabled={phaseIndex === 0}
                      title="上移阶段"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-muted"
                      onClick={() => movePhase(phaseIndex, 'down')}
                      disabled={phaseIndex === phases.length - 1}
                      title="下移阶段"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => removePhase(phaseIndex)}
                      disabled={phases.length <= 1}
                      title="删除阶段"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* 行动列表 */}
                <div className="pl-5 border-l-2 border-muted min-w-0">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <Label className="text-xs flex-shrink-0">行动模板</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addAction(phaseIndex)}
                      className="h-6 px-2 text-xs flex-shrink-0"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      添加行动
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {phase.actions.map((action, actionIndex) => (
                      <Card key={actionIndex} className="p-2 bg-muted/30 min-w-0">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="flex flex-col gap-1 mt-0.5 border-r pr-1 mr-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 hover:bg-muted"
                              onClick={() => moveAction(phaseIndex, actionIndex, 'up')}
                              disabled={actionIndex === 0}
                              title="上移行动"
                            >
                              <ChevronUp className="w-2.5 h-2.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 hover:bg-muted"
                              onClick={() => moveAction(phaseIndex, actionIndex, 'down')}
                              disabled={actionIndex === phase.actions.length - 1}
                              title="下移行动"
                            >
                              <ChevronDown className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <Input
                              value={action.title_template}
                              onChange={(e) => {
                                const newPhases = [...phases]
                                newPhases[phaseIndex].actions[actionIndex].title_template = e.target.value
                                onPhasesChange(newPhases)
                              }}
                              placeholder="行动标题模板（使用 {n} 占位符）"
                              className="h-6 text-xs w-full"
                            />
                            <Textarea
                              value={action.definition}
                              onChange={(e) => {
                                const newPhases = [...phases]
                                newPhases[phaseIndex].actions[actionIndex].definition = e.target.value
                                onPhasesChange(newPhases)
                              }}
                              placeholder="行动定义"
                              rows={2}
                              className="text-xs w-full resize-none"
                            />
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={action.estimated_time}
                                onChange={(e) => {
                                  const newPhases = [...phases]
                                  newPhases[phaseIndex].actions[actionIndex].estimated_time = e.target.value
                                  onPhasesChange(newPhases)
                                }}
                                placeholder="预计时间（分钟）"
                                className="h-6 text-xs flex-1"
                              />
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Label className="text-[10px] text-muted-foreground whitespace-nowrap">生成数量：</Label>
                                <Input
                                  type="number"
                                  value={action.count || '7'}
                                  onChange={(e) => {
                                    const newPhases = [...phases]
                                    newPhases[phaseIndex].actions[actionIndex].count = e.target.value
                                    onPhasesChange(newPhases)
                                  }}
                                  placeholder="7"
                                  min="1"
                                  max="100"
                                  className="h-6 w-16 text-xs"
                                />
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              此行动模板将生成 {action.count || '7'} 个行动（使用 {`{n}`} 占位符）
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 flex-shrink-0"
                            onClick={() => removeAction(phaseIndex, actionIndex)}
                            title="删除行动"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                    {phase.actions.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
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
  )
}

