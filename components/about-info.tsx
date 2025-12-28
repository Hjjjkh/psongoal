'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Info, Target, Heart } from 'lucide-react'

/**
 * 关于信息组件
 * 显示应用信息和核心理念
 */
export default function AboutInfo() {
  return (
    <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          关于
        </CardTitle>
        <CardDescription>
          了解这个应用的设计理念
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium mb-1">核心理念</div>
              <div className="text-sm text-muted-foreground">
                每日唯一行动 - 专注于每天完成一个行动，持续进步，避免过度规划
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium mb-1">设计原则</div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>• 简单专注：不增加不必要的复杂度</div>
                <div>• 个人使用：专注于个人成长，不涉及社交</div>
                <div>• 执行力强化：通过每日唯一行动提升执行力</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            <div>版本：1.0.0</div>
            <div className="mt-1">基于 Next.js 14 + Supabase 构建</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

