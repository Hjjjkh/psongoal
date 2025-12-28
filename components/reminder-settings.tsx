'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Bell, BellOff } from 'lucide-react'
import { requestNotificationPermission, sendNotification } from '@/lib/notifications'
import { setupDailyReminder, clearAllReminders } from '@/lib/reminder-manager'
import { toast } from 'sonner'
import { handleApiResponse } from '@/lib/utils'

interface ReminderSettingsProps {
  reminderEnabled: boolean | null
  reminderTime: string | null
  currentActionTitle?: string
  currentActionDefinition?: string
  onUpdate?: () => void
  showCard?: boolean  // 是否显示外层 Card，默认 true
}

/**
 * 提醒设置组件
 * 允许用户设置每日提醒时间
 */
export default function ReminderSettings({
  reminderEnabled,
  reminderTime,
  currentActionTitle,
  currentActionDefinition,
  onUpdate,
  showCard = true,
}: ReminderSettingsProps) {
  const [enabled, setEnabled] = useState(reminderEnabled ?? false)
  const [time, setTime] = useState(reminderTime || '09:00')
  const [isSaving, setIsSaving] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default')
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'active' | 'error'>('idle')

  // 检查通知权限（只在客户端执行）
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = Notification.permission
      setPermissionStatus(permission)
      setHasPermission(permission === 'granted')
    } else {
      setPermissionStatus('unsupported')
    }
  }, [])

  // 请求通知权限
  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission()
    if (result.success) {
      setHasPermission(true)
      setPermissionStatus('granted')
      toast.success(result.message)
    } else {
      // 更新权限状态
      if (result.message.includes('已被拒绝')) {
        setPermissionStatus('denied')
      } else if (result.message.includes('不支持')) {
        setPermissionStatus('unsupported')
      }
      // 显示详细错误信息
      toast.error(result.message, {
        duration: 8000, // 显示更长时间
      })
      // 如果权限被拒绝，显示更详细的帮助信息
      if (result.message.includes('已被拒绝')) {
        setTimeout(() => {
          alert(
            '通知权限已被拒绝\n\n' +
            '要重新启用通知权限，请按以下步骤操作：\n\n' +
            'Chrome/Edge:\n' +
            '1. 点击地址栏左侧的锁图标 🔒\n' +
            '2. 找到"通知"选项\n' +
            '3. 选择"允许"或"询问"\n\n' +
            'Firefox:\n' +
            '1. 点击地址栏左侧的图标\n' +
            '2. 找到"权限" → "通知"\n' +
            '3. 选择"允许"\n\n' +
            'Safari:\n' +
            '1. Safari → 偏好设置 → 网站\n' +
            '2. 找到"通知"选项\n' +
            '3. 允许此网站发送通知'
          )
        }, 500)
      }
    }
  }

  // 保存提醒设置
  const handleSave = async () => {
    if (enabled && !hasPermission) {
      toast.error('请先授予通知权限')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/reminder-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          time: enabled ? time : null,
        }),
      })

      const result = await handleApiResponse(response, '保存失败，请重试')

      if (result.success) {
        toast.success('提醒设置已保存')
        
        // 如果禁用了提醒，清除所有提醒
        if (!enabled) {
          clearAllReminders()
          setReminderStatus('idle')
        } else {
          // 如果启用了提醒且有当前行动，设置提醒
          if (currentActionTitle && currentActionDefinition) {
            const result = await requestNotificationPermission()
            if (result.success) {
              const success = setupDailyReminder(time, currentActionTitle, currentActionDefinition)
              if (success) {
                setReminderStatus('active')
                toast.success('提醒已设置', {
                  description: `将在每天 ${time} 提醒你完成行动`,
                })
              } else {
                setReminderStatus('error')
              }
            } else {
              setReminderStatus('error')
            }
          } else {
            setReminderStatus('idle')
            toast.info('提醒将在有行动时自动设置')
          }
        }
        
        onUpdate?.()
      }
    } catch (error) {
      // handleApiResponse 已处理错误
    } finally {
      setIsSaving(false)
    }
  }

  const content = (
    <div className="space-y-4">
      {/* 通知权限检查 */}
      {!hasPermission && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg space-y-3">
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
              ⚠️ 需要授予通知权限才能使用提醒功能
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
              点击下方按钮后，浏览器会弹出权限请求对话框，请选择&ldquo;允许&rdquo;
            </p>
            {permissionStatus === 'denied' && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                ⚠️ 通知权限已被拒绝。请点击地址栏左侧的锁图标，在浏览器设置中手动启用通知权限。
              </div>
            )}
          </div>
          <Button
            onClick={handleRequestPermission}
            variant="outline"
            size="sm"
            className="w-full border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
            disabled={permissionStatus === 'denied'}
          >
            🔔 {permissionStatus === 'denied' 
              ? '权限已拒绝（需在浏览器设置中启用）' 
              : '授予通知权限'}
          </Button>
        </div>
      )}

      {/* 权限已授予提示 */}
      {hasPermission && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-2">
          <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
            <span>✓</span>
            <span>通知权限已授予，提醒功能已激活</span>
          </p>
          <Button
            onClick={() => {
              sendNotification('🔔 测试通知', {
                body: '如果你看到这条通知，说明通知功能正常工作！',
                icon: '/icon-192.png',
                badge: '/icon-192.png',
              })
              toast.success('测试通知已发送，请查看浏览器通知')
            }}
            variant="outline"
            size="sm"
            className="w-full text-xs"
          >
            🧪 测试通知功能
          </Button>
        </div>
      )}

      {/* 启用/禁用开关 */}
      <div className="flex items-center justify-between">
        <Label htmlFor="reminder-enabled" className="flex items-center gap-2">
          {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          启用每日提醒
        </Label>
        <Button
          id="reminder-enabled"
          variant={enabled ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEnabled(!enabled)}
          disabled={!hasPermission && !enabled}
        >
          {enabled ? '已启用' : '已禁用'}
        </Button>
      </div>

      {/* 提醒时间设置 */}
      {enabled && hasPermission && (
        <div className="space-y-2">
          <Label htmlFor="reminder-time">提醒时间</Label>
          <Input
            id="reminder-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            每天 {time} 会收到今日行动提醒
          </p>
        </div>
      )}

      {/* 提醒状态显示 */}
      {enabled && hasPermission && reminderStatus === 'active' && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
            <span>✓</span>
            <span>提醒已激活，将在每天 <strong>{time}</strong> 发送通知</span>
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            提示：保持页面打开或安装为PWA应用以确保提醒正常工作
          </p>
        </div>
      )}

      {/* 提醒未激活提示 */}
      {enabled && hasPermission && reminderStatus === 'idle' && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            💡 提醒将在有当前行动时自动激活
          </p>
        </div>
      )}

      {/* 保存按钮 */}
      <Button
        onClick={handleSave}
        disabled={isSaving || (enabled && !hasPermission)}
        className="w-full"
      >
        {isSaving ? '保存中...' : '保存设置'}
      </Button>
    </div>
  )

  // 如果 showCard 为 false，只返回内容（由父组件提供 Card）
  if (!showCard) {
    return content
  }

  // 否则返回完整的 Card
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          每日提醒设置
        </CardTitle>
        <CardDescription>
          设置每日提醒时间，帮助你记住完成行动。
          <br />
          <span className="text-xs mt-2 block space-y-1 text-muted-foreground">
            <span className="block">• 每天在设置的提醒时间发送今日行动提醒</span>
            <span className="block">• 每天下午6点检查，如未完成会发送提醒</span>
            <span className="block">• 目标完成时自动发送庆祝通知</span>
            <span className="block text-yellow-600 dark:text-yellow-400 font-medium mt-2">
              ⚠️ 提示：需要授予浏览器通知权限，建议安装为PWA应用以在后台接收提醒
            </span>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}

