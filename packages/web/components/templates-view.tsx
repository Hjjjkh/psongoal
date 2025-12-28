'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, Target } from 'lucide-react'
import ActionTemplateSelector from '@/components/action-template-selector'
import GoalTemplateSelector from '@/components/goal-template-selector'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

/**
 * 统一模板库管理界面
 * 整合行动模板和目标模板的管理
 */
export default function TemplatesView() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'actions' | 'goals'>('actions')

  return (
    <div className="container mx-auto py-6 px-4 pt-20 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">模板库</h1>
        <p className="text-muted-foreground">
          管理你的行动模板和目标模板，快速创建常用内容
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            行动模板
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            目标模板
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>行动模板</CardTitle>
              <CardDescription>
                管理你的个人行动模板，在创建行动时快速使用
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActionTemplateSelector
                onSelect={(template) => {
                  toast.success('模板已选择', {
                    description: '在创建行动时可以使用此模板，或前往规划页面创建行动',
                    action: {
                      label: '去创建行动',
                      onClick: () => router.push('/goals'),
                    },
                    duration: 5000,
                  })
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>目标模板</CardTitle>
              <CardDescription>
                管理目标模板，快速创建常见类型的目标
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GoalTemplateSelector
                selectMode={false}
                quickCreate={true}
                onQuickCreate={(template) => {
                  console.log('Quick create template:', template)
                  // 将模板数据存储到 sessionStorage，然后跳转到目标页面
                  try {
                    sessionStorage.setItem('quickCreateTemplate', JSON.stringify(template))
                    console.log('Template saved to sessionStorage')
                    router.push('/goals')
                  } catch (error) {
                    console.error('Failed to save template to sessionStorage:', error)
                    toast.error('保存模板数据失败，请重试')
                  }
                }}
                onSelect={(template) => {
                  toast.success('模板已选择', {
                    description: '可以在创建目标时使用此模板，或前往规划页面创建目标',
                    action: {
                      label: '去创建目标',
                      onClick: () => router.push('/goals'),
                    },
                    duration: 5000,
                  })
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

