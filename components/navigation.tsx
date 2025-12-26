'use client'

import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, Target, BarChart3, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { path: '/today', label: '今日', icon: Home },
    { path: '/goals', label: '规划', icon: Target },
    { path: '/dashboard', label: '复盘', icon: BarChart3 },
  ]

  const handleNavigate = (path: string) => {
    router.push(path)
    setMobileMenuOpen(false)
  }

  return (
    <>
      {/* 桌面端导航栏 */}
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

            {/* 桌面端导航项 */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.path
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? 'default' : 'ghost'}
                    onClick={() => handleNavigate(item.path)}
                    className={cn(
                      'gap-2',
                      isActive && 'bg-primary text-primary-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                )
              })}
            </div>

            {/* 移动端菜单按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* 移动端菜单 */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 z-50 border-b bg-background">
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
                    className={cn(
                      'justify-start gap-2 h-12',
                      isActive && 'bg-primary text-primary-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5" />
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

