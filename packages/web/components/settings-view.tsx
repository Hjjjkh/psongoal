'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ReminderSettings from '@/components/reminder-settings'
import DataExportImport from '@/components/data-export-import'
import AccountInfo from '@/components/account-info'
import AboutInfo from '@/components/about-info'
import { Settings, Bell, Download, Trash2, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface SettingsViewProps {
  reminderEnabled?: boolean | null
  reminderTime?: string | null
}

/**
 * 设置页面视图
 * 集中管理所有系统设置
 */
export default function SettingsView({ reminderEnabled, reminderTime }: SettingsViewProps) {
  const router = useRouter()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  // 删除所有数据
  const handleClearAllData = async () => {
    setIsClearing(true)
    try {
      const response = await fetch('/api/data/clear-all', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || '删除失败'
        
        if (response.status === 401) {
          toast.error('未授权', {
            description: '请重新登录后重试',
          })
        } else {
          toast.error('删除失败', {
            description: errorMessage,
            duration: 5000,
          })
        }
        // 重置状态，确保UI正常显示
        setIsClearing(false)
        setShowClearConfirm(false)
        return
      }

      const result = await response.json()
      
      if (result.success) {
        toast.success('所有数据已删除', {
          description: '账户信息已保留，正在跳转到目标规划页面',
          duration: 3000,
        })
        
        // 重置状态，确保UI正常显示
        setShowClearConfirm(false)
        setIsClearing(false)
        
        // 【优化】删除数据后，用户没有目标，直接跳转到目标规划页面
        // 避免先跳转到首页再重定向的二次跳转
        setTimeout(() => {
          router.push('/goals')
          // 实时同步会自动更新数据，无需手动刷新
        }, 1500)
      } else {
        // 如果删除失败，也要重置状态
        setIsClearing(false)
      }
    } catch (error) {
      console.error('Clear all data error:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('网络连接失败', {
          description: '请检查网络连接后重试',
          duration: 5000,
        })
      } else {
        toast.error('删除失败', {
          description: errorMessage,
        })
      }
      // 确保错误时也重置对话框状态
      setShowClearConfirm(false)
    } finally {
      // 确保在所有情况下都重置加载状态
      setIsClearing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6 pt-20" suppressHydrationWarning>
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        {/* 页面标题 */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            设置
          </h1>
          <p className="text-sm text-muted-foreground">
            管理系统设置和偏好
          </p>
        </div>

        {/* 提醒设置 */}
        <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm hover:border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary transition-transform duration-200 hover:scale-110" />
              提醒设置
            </CardTitle>
            <CardDescription>
              设置每日提醒时间，帮助你记住完成行动
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReminderSettings
              reminderEnabled={reminderEnabled ?? null}
              reminderTime={reminderTime ?? null}
              showCard={false}
            />
          </CardContent>
        </Card>

        {/* 数据管理 */}
        <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm hover:border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              数据管理
            </CardTitle>
            <CardDescription>
              备份你的数据或从备份恢复
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataExportImport />
          </CardContent>
        </Card>

        {/* 危险操作：删除所有数据 */}
        <Card className="border-red-200 dark:border-red-800 shadow-lg hover:shadow-xl transition-all duration-300 bg-red-50/50 dark:bg-red-900/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              危险操作
            </CardTitle>
            <CardDescription className="text-red-700 dark:text-red-300">
              删除所有数据（账户信息将保留）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800 dark:text-red-200 space-y-2">
                  <p className="font-medium">⚠️ 此操作不可恢复！</p>
                  <p>删除后将清除以下所有数据：</p>
                  <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                    <li>所有目标、阶段和行动</li>
                    <li>所有执行记录和复盘数据</li>
                    <li>所有待办事项</li>
                    <li>所有专注会话记录</li>
                    <li>所有自定义模板</li>
                    <li>系统状态和提醒设置</li>
                  </ul>
                  <p className="text-xs mt-2 font-medium">
                    ✓ 账户信息（邮箱、登录凭证）将保留
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setShowClearConfirm(true)}
              variant="destructive"
              className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              disabled={isClearing}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isClearing ? '删除中...' : '删除所有数据'}
            </Button>
          </CardContent>
        </Card>

        {/* 账户信息 */}
        <AccountInfo />

        {/* 关于 */}
        <AboutInfo />

        {/* 删除确认对话框 */}
        <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
                确认删除所有数据
              </DialogTitle>
              <DialogDescription className="text-red-700 dark:text-red-300">
                此操作不可恢复，请谨慎操作
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  将删除以下所有数据：
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-red-700 dark:text-red-300 ml-2">
                  <li>所有目标、阶段和行动</li>
                  <li>所有执行记录和复盘数据</li>
                  <li>所有待办事项</li>
                  <li>所有专注会话记录</li>
                  <li>所有自定义模板</li>
                  <li>系统状态和提醒设置</li>
                </ul>
                <p className="text-xs mt-3 pt-3 border-t border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-medium">
                  ✓ 账户信息（邮箱、登录凭证）将保留
                </p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  💡 建议：在删除前先导出数据作为备份
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearAllData}
                disabled={isClearing}
              >
                {isClearing ? '删除中...' : '确认删除'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

