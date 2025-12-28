'use client'

import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, Target, BarChart3, Settings, Menu, X, BookOpen, Timer } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function SidebarNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { path: '/today', label: '今日', icon: Home },
    { path: '/focus', label: '专注空间', icon: Timer },
    { path: '/goals', label: '规划', icon: Target },
    { path: '/dashboard', label: '复盘', icon: BarChart3 },
    { path: '/templates', label: '模板库', icon: BookOpen },
    { path: '/settings', label: '设置', icon: Settings },
  ]

  const handleNavigate = (path: string) => {
    router.push(path)
    setMenuOpen(false)
  }

  return (
    <>
      {/* 顶部导航栏（桌面端和移动端都显示） */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo/应用名称 */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-lg font-semibold hidden sm:inline-block">目标执行</span>
            </div>

            {/* 菜单按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* 下拉菜单（所有设备都显示，只在客户端渲染） */}
      {menuOpen && (
        <div 
          id="mobile-menu"
          className="fixed inset-x-0 top-16 z-50 border-b bg-background shadow-lg"
          role="menu"
          aria-label="导航菜单"
        >
          <div className="container mx-auto px-4 py-2">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.path
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? 'default' : 'ghost'}
                    onClick={() => handleNavigate(item.path)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleNavigate(item.path)
                      }
                    }}
                    className={cn(
                      'justify-start gap-2 h-12',
                      isActive && 'bg-primary text-primary-foreground'
                    )}
                    role="menuitem"
                    aria-label={`导航到${item.label}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    {item.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      )}

    </>
  )
}

