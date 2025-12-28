'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ReminderSettings from '@/components/reminder-settings'
import DataExportImport from '@/components/data-export-import'
import AccountInfo from '@/components/account-info'
import AboutInfo from '@/components/about-info'
import { Settings, Bell, Download } from 'lucide-react'

interface SettingsViewProps {
  reminderEnabled?: boolean | null
  reminderTime?: string | null
}

/**
 * 设置页面视图
 * 集中管理所有系统设置
 */
export default function SettingsView({ reminderEnabled, reminderTime }: SettingsViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6 pt-20">
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
        <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
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
        <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
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

        {/* 账户信息 */}
        <AccountInfo />

        {/* 关于 */}
        <AboutInfo />
      </div>
    </div>
  )
}

