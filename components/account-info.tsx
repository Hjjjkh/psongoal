'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Mail, Calendar, Target, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface UserInfo {
  email: string | null
  created_at: string | null
  last_sign_in_at: string | null
}

interface UserStats {
  totalGoals: number
  completedGoals: number
  activeGoals: number
}

/**
 * 账户信息组件
 * 显示用户基本信息
 */
export default function AccountInfo() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (user && !error) {
          setUserInfo({
            email: user.email || null,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at || null,
          })

          // 加载用户统计信息
          const { data: goals, error: goalsError } = await supabase
            .from('goals')
            .select('id, status')
            .eq('user_id', user.id)

          if (!goalsError && goals) {
            const totalGoals = goals.length
            const completedGoals = goals.filter(g => g.status === 'completed').length
            const activeGoals = goals.filter(g => g.status === 'active').length

            setUserStats({
              totalGoals,
              completedGoals,
              activeGoals,
            })
          }
        }
      } catch (error) {
        console.error('Error loading user info:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserInfo()
  }, [])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '未知'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return '未知'
    }
  }

  return (
    <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          账户信息
        </CardTitle>
        <CardDescription>
          查看你的账户基本信息
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">加载中...</div>
        ) : userInfo ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-sm font-medium">邮箱</div>
                <div className="text-sm text-muted-foreground">{userInfo.email || '未设置'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-sm font-medium">注册时间</div>
                <div className="text-sm text-muted-foreground">{formatDate(userInfo.created_at)}</div>
              </div>
            </div>
            {userInfo.last_sign_in_at && (
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">最后登录</div>
                  <div className="text-sm text-muted-foreground">{formatDate(userInfo.last_sign_in_at)}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">无法加载账户信息</div>
        )}

        {/* 用户统计信息 */}
        {userStats && (
          <div className="pt-4 border-t space-y-3">
            <div className="text-sm font-medium mb-2">数据统计</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted rounded-lg">
                <Target className="w-4 h-4 mx-auto mb-1 text-primary" />
                <div className="text-lg font-semibold">{userStats.totalGoals}</div>
                <div className="text-xs text-muted-foreground">总目标</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-600 dark:text-green-400" />
                <div className="text-lg font-semibold">{userStats.completedGoals}</div>
                <div className="text-xs text-muted-foreground">已完成</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Target className="w-4 h-4 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                <div className="text-lg font-semibold">{userStats.activeGoals}</div>
                <div className="text-xs text-muted-foreground">进行中</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

