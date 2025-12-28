'use client'

import React, { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// 密码强度验证
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: '密码至少需要 8 个字符' }
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个字母' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个数字' }
  }
  return { valid: true }
}

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [passwordError, setPasswordError] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 注册时验证密码
    if (isSignUp) {
      const validation = validatePassword(password)
      if (!validation.valid) {
        setPasswordError(validation.message || '')
        toast.error(validation.message || '密码不符合要求')
        return
      }
      setPasswordError('')
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      if (isSignUp) {
        // 获取当前域名（客户端始终使用 window.location.origin）
        // 这样本地开发时自动使用 http://localhost:3000
        // 线上环境自动使用 https://psongoal.zeabur.app
        const siteUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : (process.env.NEXT_PUBLIC_SITE_URL || 'https://psongoal.zeabur.app')
        
        console.log('注册时使用的回调 URL:', `${siteUrl}/auth/callback`)
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${siteUrl}/auth/callback`,
          },
        })
        if (error) {
          console.error('Sign up error:', error)
          throw error
        }
        console.log('Sign up success:', data)
        // 检查是否需要邮箱验证
        if (data.user && !data.session) {
          // 需要邮箱验证
          toast.success('注册成功！', {
            description: '请检查邮箱（包括垃圾邮件文件夹）并点击验证链接，验证后即可登录',
            duration: 6000,
          })
        } else if (data.session) {
          // 不需要验证，可以直接登录
          toast.success('注册成功！', {
            description: '账户已创建，正在跳转...',
            duration: 2000,
          })
          // 等待一下确保 cookie 已经设置
          await new Promise(resolve => setTimeout(resolve, 100))
          // 直接跳转
          const redirectTo = searchParams.get('redirectedFrom') || '/today'
          router.refresh()
          router.push(redirectTo)
          return
        } else {
          toast.success('注册成功！', {
            description: '请检查邮箱（包括垃圾邮件文件夹）并点击验证链接',
            duration: 6000,
          })
        }
        // 注册成功后自动切换到登录模式
        setIsSignUp(false)
        setEmail('')
        setPassword('')
      } else {
        // 登录逻辑：调用 signInWithPassword，成功后直接跳转
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          console.error('Sign in error:', error)
          throw error
        }
        
        // 验证登录是否成功
        if (!data.session) {
          throw new Error('登录失败：未获取到 session')
        }
        
        // 登录成功，等待一下确保 cookie 已经设置
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // 获取重定向目标（如果有）
        const redirectTo = searchParams.get('redirectedFrom') || '/today'
        
        // 先刷新路由以更新服务器组件状态
        router.refresh()
        
        // 然后跳转到目标页面
        router.push(redirectTo)
      }
    } catch (error: unknown) {
      console.error('Auth error:', error)
      let message = '操作失败，请检查网络连接'
      
      if (error instanceof Error) {
        message = error.message
        // 处理常见的网络错误
        if (error.message.includes('fetch') || error.message.includes('network')) {
          message = '网络连接失败，请检查网络设置或稍后重试'
        } else if (error.message.includes('Invalid API key')) {
          message = 'API 密钥错误，请检查配置'
        } else if (error.message.includes('Invalid login credentials')) {
          message = '邮箱或密码错误'
        }
      }
      
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? '注册' : '登录'}</CardTitle>
          <CardDescription>
            {isSignUp
              ? '创建账户开始使用个人目标执行系统'
              : '登录你的账户'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordError('')
                }}
                required
                placeholder="••••••••"
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
              {isSignUp && (
                <p className="text-xs text-muted-foreground">
                  密码至少 8 位，包含字母和数字
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '处理中...' : isSignUp ? '注册' : '登录'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? '已有账户？登录' : '没有账户？注册'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">加载中...</div>
          </CardContent>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

