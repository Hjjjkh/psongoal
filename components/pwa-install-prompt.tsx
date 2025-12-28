'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Download } from 'lucide-react'

/**
 * PWA 安装提示组件
 * 在支持的设备上提示用户安装应用
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // 确保在客户端执行
    if (typeof window === 'undefined') {
      return
    }

    // 检查是否已经安装
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    // 监听 beforeinstallprompt 事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // 检查是否已经显示过提示
      try {
        const hasSeenPrompt = localStorage.getItem('hasSeenPWAInstallPrompt')
        if (!hasSeenPrompt) {
          setShowPrompt(true)
        }
      } catch (error) {
        // localStorage 可能不可用（如隐私模式）
        console.warn('无法访问 localStorage:', error)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return
    }

    try {
      // 显示安装提示
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        // 用户接受了安装
        setShowPrompt(false)
      }

      setDeferredPrompt(null)
      try {
        localStorage.setItem('hasSeenPWAInstallPrompt', 'true')
      } catch (error) {
        console.warn('无法保存到 localStorage:', error)
      }
    } catch (error) {
      console.error('安装失败:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    try {
      localStorage.setItem('hasSeenPWAInstallPrompt', 'true')
    } catch (error) {
      console.warn('无法保存到 localStorage:', error)
    }
  }

  if (!showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <Card className="shadow-2xl border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              安装应用
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
              aria-label="关闭安装提示"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
          <CardDescription>
            安装到设备，随时随地完成行动
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              className="flex-1"
            >
              安装
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="flex-1"
            >
              稍后
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

