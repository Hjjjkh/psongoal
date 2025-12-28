'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, Upload, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { handleApiResponse } from '@/lib/utils'

/**
 * 数据导出/导入组件
 */
export default function DataExportImport() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [importData, setImportData] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 导出数据
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/export')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || '导出失败'
        
        if (response.status === 401) {
          toast.error('未授权', {
            description: '请重新登录后重试',
          })
        } else if (response.status === 500) {
          toast.error('服务器错误', {
            description: '服务器暂时无法处理请求，请稍后重试',
            duration: 5000,
          })
        } else {
          toast.error('导出失败', {
            description: errorMessage,
          })
        }
        return
      }

      const blob = await response.blob()
      
      // 检查blob是否为空或无效
      if (blob.size === 0) {
        toast.error('导出失败', {
          description: '导出的数据为空，请检查是否有数据',
        })
        return
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pes-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('数据导出成功', {
        description: '文件已下载到你的设备',
      })
    } catch (error) {
      console.error('Export error:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      // 检查是否是网络错误
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('网络连接失败', {
          description: '请检查网络连接后重试',
          duration: 5000,
        })
      } else {
      toast.error('导出失败', {
          description: errorMessage,
      })
      }
    } finally {
      setIsExporting(false)
    }
  }

  // 导入数据
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    // 验证文件类型
    if (!file.name.endsWith('.json')) {
      toast.error('文件格式错误', {
        description: '请选择 JSON 格式的文件',
      })
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // 验证文件大小（限制为10MB）
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('文件过大', {
        description: '文件大小不能超过 10MB',
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setIsImporting(true)
    try {
      const text = await file.text()
      
      // 验证文件是否为空
      if (!text || text.trim().length === 0) {
        toast.error('文件格式错误', {
          description: '文件内容为空',
        })
        setIsImporting(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      let data: any
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        toast.error('文件格式错误', {
          description: 'JSON 格式不正确，请检查文件内容',
        })
        setIsImporting(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      // 验证数据结构
      if (!data || typeof data !== 'object') {
        toast.error('文件格式错误', {
          description: '文件内容格式不正确',
        })
        setIsImporting(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      // 显示确认对话框
      setIsImporting(false)
      setImportData(data)
      setShowImportConfirm(true)
    } catch (error: any) {
      console.error('Import error:', error)
      
      if (error instanceof SyntaxError) {
        toast.error('文件格式错误', {
          description: 'JSON 格式不正确，请检查文件内容',
        })
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('网络连接失败', {
          description: '请检查网络连接后重试',
          duration: 5000,
        })
      } else {
        toast.error('导入失败', {
          description: error.message || '请重试',
        })
      }
    } finally {
      setIsImporting(false)
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 确认导入
  const handleConfirmImport = async () => {
    if (!importData) return

    setIsImporting(true)
    setShowImportConfirm(false)

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData),
      })

      const result = await handleApiResponse<{
        success: boolean
        imported: {
          goals: number
          phases: number
          actions: number
          executions: number
        }
      }>(response, '导入失败，请重试')

      if (result.success && result.data) {
        toast.success('数据导入成功', {
          description: `已导入 ${result.data.imported.goals} 个目标，${result.data.imported.actions} 个行动`,
          duration: 3000,
        })
        
        // 刷新页面
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch (error: any) {
      console.error('Import error:', error)
      
      if (error instanceof SyntaxError) {
        toast.error('文件格式错误', {
          description: 'JSON 格式不正确，请检查文件内容',
        })
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('网络连接失败', {
          description: '请检查网络连接后重试',
          duration: 5000,
        })
      } else {
        toast.error('导入失败', {
          description: error.message || '请重试',
        })
      }
    } finally {
      setIsImporting(false)
      setImportData(null)
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 获取导入数据统计
  const getImportStats = () => {
    if (!importData) return null
    return {
      goals: importData.goals?.length || 0,
      phases: importData.phases?.length || 0,
      actions: importData.actions?.length || 0,
      executions: importData.daily_executions?.length || 0,
    }
  }

  return (
    <div className="space-y-4">
        {/* 警告提示 */}
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-1">导入注意事项：</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>导入数据会合并到现有数据中</li>
                <li>如果数据已存在，可能会被覆盖</li>
                <li>建议在导入前先导出当前数据作为备份</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 导出按钮 */}
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full"
          variant="default"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? '导出中...' : '导出数据'}
        </Button>

        {/* 导入按钮 */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            id="import-file-input"
            disabled={isImporting}
          />
          <Button
            onClick={() => {
              const input = document.getElementById('import-file-input') as HTMLInputElement
              input?.click()
            }}
            disabled={isImporting}
            className="w-full"
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isImporting ? '导入中...' : '导入数据'}
          </Button>
        </div>

        {/* 导入确认对话框 */}
        <Dialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认导入数据</DialogTitle>
              <DialogDescription>
                导入数据将合并到现有数据中，如果数据已存在，可能会被覆盖。
              </DialogDescription>
            </DialogHeader>
            {importData && (
              <div className="space-y-3 py-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">导入数据统计：</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">目标：</span>
                      <span className="ml-2 font-medium">{getImportStats()?.goals || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">阶段：</span>
                      <span className="ml-2 font-medium">{getImportStats()?.phases || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">行动：</span>
                      <span className="ml-2 font-medium">{getImportStats()?.actions || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">执行记录：</span>
                      <span className="ml-2 font-medium">{getImportStats()?.executions || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    ⚠️ 建议在导入前先导出当前数据作为备份
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportConfirm(false)
                  setImportData(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                disabled={isImporting}
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={isImporting}
                variant="default"
              >
                {isImporting ? '导入中...' : '确认导入'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}

