'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Goal } from '@/lib/types'
import { TrendingUp, AlertCircle, BarChart3, LineChart, AreaChart } from 'lucide-react'
import { 
  LineChart as RechartsLineChart, 
  AreaChart as RechartsAreaChart, 
  BarChart as RechartsBarChart,
  Line, 
  Area, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'

interface GoalWithStats extends Goal {
  progress: number
  totalActions: number
  completedActions: number
  stuckPhases: Array<{ phaseId: string; days: number }>
}

interface DayData {
  date: string
  completed: number
  total: number
  avgDifficulty: number | null
  avgEnergy: number | null
}

interface DashboardViewProps {
  goals: GoalWithStats[]
  consecutiveDays: number
  dailyStats: DayData[]
  hasCurrentAction: boolean
  todayCompleted: boolean
}

type ChartType = 'line' | 'area' | 'bar'

export default function DashboardView({ goals, consecutiveDays, dailyStats, hasCurrentAction, todayCompleted }: DashboardViewProps) {
  const router = useRouter()
  const [difficultyChartType, setDifficultyChartType] = useState<ChartType>('line')
  const [energyChartType, setEnergyChartType] = useState<ChartType>('line')
  
  // 分析数据分布情况
  const today = new Date().toISOString().split('T')[0]
  
  // 找到所有有数据的日期（有完成记录或总记录）
  const datesWithData = dailyStats
    .filter(d => d.completed > 0 || d.total > 0)
    .map(d => d.date)
    .sort()
  
  // 找到最早和最晚有数据的日期
  const firstDataDate = datesWithData.length > 0 ? datesWithData[0] : null
  const lastDataDate = datesWithData.length > 0 ? datesWithData[datesWithData.length - 1] : null
  
  // 判断数据分布情况
  const hasHistoricalData = firstDataDate && firstDataDate !== today // 今天之前有数据
  const todayHasData = datesWithData.includes(today) // 今天有数据
  const dataCount = datesWithData.length // 有数据的日期数量
  const isFirstRecord = dataCount === 1 && todayHasData // 今天第一次记录
  
  // 判断今天是否应该显示在最右侧
  // 只有在有历史数据且今天有数据时，才显示在最右侧
  const shouldShowTodayAtEnd = hasHistoricalData && todayHasData && !isFirstRecord

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        {/* 页面标题区域 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              复盘看板
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              追踪你的执行进度和趋势
            </p>
          </div>
          {hasCurrentAction && !todayCompleted && (
            <Button 
              onClick={() => router.push('/today')} 
              size="lg"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all"
            >
              开始今日行动
            </Button>
          )}
          {todayCompleted && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">✅ 今日已完成</span>
            </div>
          )}
        </div>

        {/* 关键指标卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

          {/* 今日完成状态卡片 */}
          {hasCurrentAction && (
            <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
              todayCompleted 
                ? 'border-green-500/50 dark:border-green-600/50 bg-gradient-to-br from-green-500/5 to-green-500/0' 
                : 'border-orange-500/50 dark:border-orange-600/50 bg-gradient-to-br from-orange-500/5 to-orange-500/0'
            }`}>
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${
                todayCompleted ? 'bg-green-500' : 'bg-orange-500'
              }`} />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {todayCompleted ? (
                    <>
                      <span className="text-2xl">✅</span>
                      <span>今日已完成</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">⏰</span>
                      <span>今日待完成</span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                {todayCompleted ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      今天你已经完成了行动，继续保持！
                    </p>
                    <p className="text-xs text-muted-foreground">
                      明天将自动显示下一个行动
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      今天还没有完成行动，去完成今日行动吧
                    </p>
                    <Button 
                      onClick={() => router.push('/today')} 
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700" 
                      size="lg"
                    >
                      去完成今日行动
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 连续完成天数卡片 */}
          <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-primary/5 to-primary/0 border-primary/20">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
                连续完成天数
              </CardTitle>
              <CardDescription>
                记录你持续完成行动的天数
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-4">
                <div className="text-6xl font-bold text-center py-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {consecutiveDays}
                  <span className="text-3xl text-muted-foreground ml-2">天</span>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    {consecutiveDays > 0
                      ? todayCompleted
                        ? `已连续完成 ${consecutiveDays} 天（含今天），继续保持！`
                        : `已连续完成 ${consecutiveDays} 天，今天还未完成`
                      : '还没有完成记录，从今天开始吧'}
                  </p>
                  <p className="text-xs text-muted-foreground/70 text-center">
                    连续完成天数按日期计算，每天完成1个行动即算1天
                  </p>
                  {consecutiveDays === 0 && hasCurrentAction && !todayCompleted && (
                    <div className="flex justify-center pt-2">
                      <Button 
                        onClick={() => router.push('/today')} 
                        size="sm"
                        variant="outline"
                        className="border-primary/20 hover:bg-primary/10"
                      >
                        去完成今日行动
                      </Button>
                    </div>
                  )}
                  {consecutiveDays > 0 && !todayCompleted && hasCurrentAction && (
                    <div className="flex justify-center pt-2">
                      <Button 
                        onClick={() => router.push('/today')} 
                        size="sm"
                        className="bg-gradient-to-r from-primary to-primary/80"
                      >
                        完成今日行动，保持连续
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* 图表区域 */}
        <div className="space-y-6 md:space-y-8">
          {/* 最近30天完成趋势 */}
          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    最近30天完成趋势
                  </CardTitle>
                  <CardDescription className="mt-1">
                    帮助你判断：我是不是在滑坡？
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          <CardContent>
            {dailyStats.filter(d => d.completed > 0).length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">还没有完成记录</p>
                {hasCurrentAction && !todayCompleted && (
                  <Button 
                    onClick={() => router.push('/today')} 
                    size="sm"
                    variant="outline"
                  >
                    去完成今日行动
                  </Button>
                )}
              </div>
            ) : (
            <div className="space-y-4">
              {/* 完成率趋势图（现代化图表） */}
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={dailyStats.map((day, idx) => ({
                    date: day.date,
                    dateLabel: idx === dailyStats.length - 1 ? '今天' : idx === 0 ? '30天前' : '',
                    completed: day.completed > 0 ? 1 : 0,
                    hasRecord: day.total > 0 ? 1 : 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={shouldShowTodayAtEnd ? "preserveStartEnd" : 0}
                      tickCount={dataCount > 10 ? 8 : dataCount > 5 ? 6 : Math.max(dataCount, 3)}
                      tickFormatter={(value, index) => {
                        const date = new Date(value)
                        
                        // 如果今天应该显示在最右侧，且当前值是今天
                        if (value === today && shouldShowTodayAtEnd) {
                          return '今天'
                        }
                        
                        // 如果今天是第一次记录，且当前值是今天，显示"今天"但不强制在最右侧
                        if (value === today && isFirstRecord) {
                          return '今天'
                        }
                        
                        // 如果今天有数据但不应该显示在最右侧，且当前值是今天，显示日期
                        if (value === today && todayHasData && !shouldShowTodayAtEnd) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        // 数据很少时（<=5天），显示所有有数据的日期
                        if (dataCount <= 5) {
                          if (datesWithData.includes(value)) {
                            return `${date.getMonth() + 1}/${date.getDate()}`
                          }
                          return ''
                        }
                        
                        // 数据较多时，只显示关键日期
                        // 显示第一个日期
                        if (index === 0 && firstDataDate) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        // 每隔约5天显示一个标签
                        if (index % Math.max(1, Math.floor(dataCount / 6)) === 0) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        return ''
                      }}
                    />
                    <YAxis 
                      domain={[0, 1]}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => value === 1 ? '完成' : ''}
                      hide
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                      labelFormatter={(label) => `日期: ${label}`}
                      formatter={(value: any, name?: string) => {
                        if (value === 1) return ['已完成', '状态']
                        return ['未完成', '状态']
                      }}
                    />
                    <Bar 
                      dataKey="completed" 
                      fill="hsl(142 76% 36%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
              
              {/* 简化版条形图（作为补充视图） */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">每日完成情况（简化视图）</span>
                  <span className="text-muted-foreground">
                    {dailyStats.filter(d => d.completed > 0).length} / 30 天有完成
                  </span>
                </div>
                <div className="flex gap-1 h-10 items-end">
                  {dailyStats.map((day, index) => {
                    const hasCompleted = day.completed > 0
                    const isToday = index === dailyStats.length - 1
                    const height = hasCompleted ? 100 : (day.total > 0 ? 25 : 8)
                    const bgColor = hasCompleted
                      ? 'bg-green-500 dark:bg-green-600'
                      : isToday && !hasCompleted && hasCurrentAction
                      ? 'bg-orange-500 dark:bg-orange-600'
                      : day.total > 0
                      ? 'bg-red-500 dark:bg-red-600'
                      : 'bg-muted'
                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center gap-0.5"
                        title={`${day.date}${isToday ? ' (今天)' : ''}: ${hasCompleted ? '已完成' : day.total > 0 ? '未完成' : '无记录'}`}
                      >
                        <div
                          className={`w-full rounded-t transition-all hover:opacity-80 ${isToday ? 'ring-2 ring-offset-1 ring-primary' : ''} ${bgColor}`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>30天前</span>
                  <span className="font-medium">今天</span>
                </div>
              </div>

              {/* 简单统计 */}
              {(() => {
                const completedDays = dailyStats.filter(d => d.completed > 0).length
                const daysWithRecords = dailyStats.filter(d => d.total > 0).length
                // 完成率：如果有记录的天数 > 0，基于有记录的天数计算；否则基于总天数计算
                const completionRate = daysWithRecords > 0
                  ? Math.round((completedDays / daysWithRecords) * 100)
                  : (dailyStats.length > 0 ? Math.round((completedDays / dailyStats.length) * 100) : 0)
                
                return (
                  <div className="grid grid-cols-3 gap-4 md:gap-6 pt-6 border-t border-border/50">
                    <div className="text-center p-4 rounded-lg bg-green-500/5 border border-green-500/10">
                      <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                        {completedDays}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">有完成天数</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-green-500/5 border border-green-500/10">
                      <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                        {completedDays}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">总完成次数</div>
                      <div className="text-xs text-muted-foreground mt-1">（每日唯一行动）</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-green-500/5 border border-green-500/10">
                      <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                        {completionRate}
                        <span className="text-2xl">%</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">完成率</div>
                      {daysWithRecords > 0 && daysWithRecords < dailyStats.length && (
                        <div className="text-xs text-muted-foreground mt-1">
                          ({completedDays}/{daysWithRecords} 天)
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
            )}
          </CardContent>
        </Card>

          {/* 难度趋势 */}
          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-500" />
                    难度趋势
                  </CardTitle>
                  <CardDescription className="mt-1">
                    帮助你判断：我的安排是否越来越难？
                  </CardDescription>
                </div>
              <Select value={difficultyChartType} onValueChange={(v) => setDifficultyChartType(v as ChartType)}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <LineChart className="w-3 h-3" />
                      <span>折线图</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="area">
                    <div className="flex items-center gap-2">
                      <AreaChart className="w-3 h-3" />
                      <span>面积图</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-3 h-3" />
                      <span>柱状图</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {dailyStats.filter(d => d.avgDifficulty !== null && d.completed > 0).length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">还没有难度数据</p>
                {hasCurrentAction && !todayCompleted && (
                  <Button 
                    onClick={() => router.push('/today')} 
                    size="sm"
                    variant="outline"
                  >
                    去完成今日行动
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* 难度趋势图表 */}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {difficultyChartType === 'line' ? (
                      <RechartsLineChart data={dailyStats.map((day, idx) => ({
                        date: day.date,
                        dateLabel: idx === dailyStats.length - 1 ? '今天' : idx === 0 ? '30天前' : '',
                        difficulty: day.avgDifficulty !== null && day.completed > 0 ? day.avgDifficulty : null,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={shouldShowTodayAtEnd ? "preserveStartEnd" : 0}
                      tickCount={dataCount > 10 ? 8 : dataCount > 5 ? 6 : Math.max(dataCount, 3)}
                      tickFormatter={(value, index) => {
                        const date = new Date(value)
                        
                        // 如果今天应该显示在最右侧，且当前值是今天
                        if (value === today && shouldShowTodayAtEnd) {
                          return '今天'
                        }
                        
                        // 如果今天是第一次记录，且当前值是今天，显示"今天"但不强制在最右侧
                        if (value === today && isFirstRecord) {
                          return '今天'
                        }
                        
                        // 如果今天有数据但不应该显示在最右侧，且当前值是今天，显示日期
                        if (value === today && todayHasData && !shouldShowTodayAtEnd) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        // 数据很少时（<=5天），显示所有有数据的日期
                        if (dataCount <= 5) {
                          if (datesWithData.includes(value)) {
                            return `${date.getMonth() + 1}/${date.getDate()}`
                          }
                          return ''
                        }
                        
                        // 数据较多时，只显示关键日期
                        // 显示第一个日期
                        if (index === 0 && firstDataDate) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        // 每隔约5天显示一个标签
                        if (index % Math.max(1, Math.floor(dataCount / 6)) === 0) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        return ''
                      }}
                    />
                        <YAxis 
                          domain={[0, 5]}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => value.toString()}
                          width={40}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                          labelFormatter={(label) => `日期: ${label}`}
                          formatter={(value: any) => value !== null ? [`${value.toFixed(1)}/5`, '难度'] : ['无数据', '']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="difficulty" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                        />
                      </RechartsLineChart>
                    ) : difficultyChartType === 'area' ? (
                      <RechartsAreaChart data={dailyStats.map((day, idx) => ({
                        date: day.date,
                        dateLabel: idx === dailyStats.length - 1 ? '今天' : idx === 0 ? '30天前' : '',
                        difficulty: day.avgDifficulty !== null && day.completed > 0 ? day.avgDifficulty : null,
                      }))}>
                        <defs>
                          <linearGradient id="difficultyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={shouldShowTodayAtEnd ? "preserveStartEnd" : 0}
                      tickCount={dataCount > 10 ? 8 : dataCount > 5 ? 6 : Math.max(dataCount, 3)}
                      tickFormatter={(value, index) => {
                        const date = new Date(value)
                        
                        // 如果今天应该显示在最右侧，且当前值是今天
                        if (value === today && shouldShowTodayAtEnd) {
                          return '今天'
                        }
                        
                        // 如果今天是第一次记录，且当前值是今天，显示"今天"但不强制在最右侧
                        if (value === today && isFirstRecord) {
                          return '今天'
                        }
                        
                        // 如果今天有数据但不应该显示在最右侧，且当前值是今天，显示日期
                        if (value === today && todayHasData && !shouldShowTodayAtEnd) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        // 数据很少时（<=5天），显示所有有数据的日期
                        if (dataCount <= 5) {
                          if (datesWithData.includes(value)) {
                            return `${date.getMonth() + 1}/${date.getDate()}`
                          }
                          return ''
                        }
                        
                        // 数据较多时，只显示关键日期
                        // 显示第一个日期
                        if (index === 0 && firstDataDate) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        // 每隔约5天显示一个标签
                        if (index % Math.max(1, Math.floor(dataCount / 6)) === 0) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        return ''
                      }}
                    />
                        <YAxis 
                          domain={[0, 5]}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => value.toString()}
                          width={40}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                          labelFormatter={(label) => `日期: ${label}`}
                          formatter={(value: any) => value !== null ? [`${value.toFixed(1)}/5`, '难度'] : ['无数据', '']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="difficulty" 
                          stroke="hsl(var(--primary))" 
                          fill="url(#difficultyGradient)"
                          strokeWidth={2}
                          connectNulls={false}
                        />
                      </RechartsAreaChart>
                    ) : (
                      <RechartsBarChart data={dailyStats.map((day, idx) => ({
                        date: day.date,
                        dateLabel: idx === dailyStats.length - 1 ? '今天' : idx === 0 ? '30天前' : '',
                        difficulty: day.avgDifficulty !== null && day.completed > 0 ? day.avgDifficulty : null,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={shouldShowTodayAtEnd ? "preserveStartEnd" : 0}
                      tickCount={dataCount > 10 ? 8 : dataCount > 5 ? 6 : Math.max(dataCount, 3)}
                      tickFormatter={(value, index) => {
                        const date = new Date(value)
                        
                        // 如果今天应该显示在最右侧，且当前值是今天
                        if (value === today && shouldShowTodayAtEnd) {
                          return '今天'
                        }
                        
                        // 如果今天是第一次记录，且当前值是今天，显示"今天"但不强制在最右侧
                        if (value === today && isFirstRecord) {
                          return '今天'
                        }
                        
                        // 如果今天有数据但不应该显示在最右侧，且当前值是今天，显示日期
                        if (value === today && todayHasData && !shouldShowTodayAtEnd) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        // 数据很少时（<=5天），显示所有有数据的日期
                        if (dataCount <= 5) {
                          if (datesWithData.includes(value)) {
                            return `${date.getMonth() + 1}/${date.getDate()}`
                          }
                          return ''
                        }
                        
                        // 数据较多时，只显示关键日期
                        // 显示第一个日期
                        if (index === 0 && firstDataDate) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        // 每隔约5天显示一个标签
                        if (index % Math.max(1, Math.floor(dataCount / 6)) === 0) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        return ''
                      }}
                    />
                        <YAxis 
                          domain={[0, 5]}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => value.toString()}
                          width={40}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                          labelFormatter={(label) => `日期: ${label}`}
                          formatter={(value: any) => value !== null ? [`${value.toFixed(1)}/5`, '难度'] : ['无数据', '']}
                        />
                        <Bar 
                          dataKey="difficulty" 
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        />
                      </RechartsBarChart>
                    )}
                  </ResponsiveContainer>
                </div>

                {/* 难度统计 */}
                <div className="pt-6 border-t border-border/50">
                  <div className="grid grid-cols-3 gap-4 md:gap-6">
                    <div className="text-center p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                        {(() => {
                          // 根据"每日唯一行动"，每天只有一条完成记录，avgDifficulty 就是当天的难度值
                          const validData = dailyStats.filter(d => d.avgDifficulty !== null && d.completed > 0)
                          if (validData.length === 0) return '-'
                          const avg = validData.reduce((sum, d) => sum + (d.avgDifficulty || 0), 0) / validData.length
                          return avg.toFixed(1)
                        })()}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">平均难度</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                        {(() => {
                          // 只统计有完成记录的日期
                          const validData = dailyStats.filter(d => d.avgDifficulty !== null && d.completed > 0)
                          if (validData.length === 0) return '-'
                          const max = Math.max(...validData.map(d => d.avgDifficulty || 0))
                          return max.toFixed(1)
                        })()}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">最高难度</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                        {(() => {
                          // 只统计有完成记录的日期
                          const validData = dailyStats.filter(d => d.avgDifficulty !== null && d.completed > 0)
                          if (validData.length === 0) return '-'
                          const min = Math.min(...validData.map(d => d.avgDifficulty || 0))
                          return min.toFixed(1)
                        })()}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">最低难度</div>
                    </div>
                  </div>
                </div>

                {/* 提示 */}
                <div className="pt-2 text-xs text-muted-foreground">
                  <strong>提示：</strong>难度范围 1-5，如果持续上升，可能需要调整计划。
                </div>
              </div>
            )}
          </CardContent>
        </Card>

          {/* 精力趋势 */}
          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                    精力趋势
                  </CardTitle>
                  <CardDescription className="mt-1">
                    帮助你判断：我的精力是否在下降？
                  </CardDescription>
                </div>
              <Select value={energyChartType} onValueChange={(v) => setEnergyChartType(v as ChartType)}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <LineChart className="w-3 h-3" />
                      <span>折线图</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="area">
                    <div className="flex items-center gap-2">
                      <AreaChart className="w-3 h-3" />
                      <span>面积图</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-3 h-3" />
                      <span>柱状图</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {dailyStats.filter(d => d.avgEnergy !== null && d.completed > 0).length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">还没有精力数据</p>
                {hasCurrentAction && !todayCompleted && (
                  <Button 
                    onClick={() => router.push('/today')} 
                    size="sm"
                    variant="outline"
                  >
                    去完成今日行动
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* 精力趋势图表 */}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {energyChartType === 'line' ? (
                      <RechartsLineChart data={dailyStats.map((day, idx) => ({
                        date: day.date,
                        dateLabel: idx === dailyStats.length - 1 ? '今天' : idx === 0 ? '30天前' : '',
                        energy: day.avgEnergy !== null && day.completed > 0 ? day.avgEnergy : null,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={shouldShowTodayAtEnd ? "preserveStartEnd" : 0}
                      tickCount={dataCount > 10 ? 8 : dataCount > 5 ? 6 : Math.max(dataCount, 3)}
                      tickFormatter={(value, index) => {
                        const date = new Date(value)
                        
                        // 如果今天应该显示在最右侧，且当前值是今天
                        if (value === today && shouldShowTodayAtEnd) {
                          return '今天'
                        }
                        
                        // 如果今天是第一次记录，且当前值是今天，显示"今天"但不强制在最右侧
                        if (value === today && isFirstRecord) {
                          return '今天'
                        }
                        
                        // 如果今天有数据但不应该显示在最右侧，且当前值是今天，显示日期
                        if (value === today && todayHasData && !shouldShowTodayAtEnd) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        // 数据很少时（<=5天），显示所有有数据的日期
                        if (dataCount <= 5) {
                          if (datesWithData.includes(value)) {
                            return `${date.getMonth() + 1}/${date.getDate()}`
                          }
                          return ''
                        }
                        
                        // 数据较多时，只显示关键日期
                        // 显示第一个日期
                        if (index === 0 && firstDataDate) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        // 每隔约5天显示一个标签
                        if (index % Math.max(1, Math.floor(dataCount / 6)) === 0) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        return ''
                      }}
                    />
                        <YAxis 
                          domain={[0, 5]}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => value.toString()}
                          width={40}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                          labelFormatter={(label) => `日期: ${label}`}
                          formatter={(value: any) => value !== null ? [`${value.toFixed(1)}/5`, '精力'] : ['无数据', '']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="energy" 
                          stroke="hsl(280 70% 50%)" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(280 70% 50%)', r: 3 }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                        />
                      </RechartsLineChart>
                    ) : energyChartType === 'area' ? (
                      <RechartsAreaChart data={dailyStats.map((day, idx) => ({
                        date: day.date,
                        dateLabel: idx === dailyStats.length - 1 ? '今天' : idx === 0 ? '30天前' : '',
                        energy: day.avgEnergy !== null && day.completed > 0 ? day.avgEnergy : null,
                      }))}>
                        <defs>
                          <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(280 70% 50%)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(280 70% 50%)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={shouldShowTodayAtEnd ? "preserveStartEnd" : 0}
                      tickCount={dataCount > 10 ? 8 : dataCount > 5 ? 6 : Math.max(dataCount, 3)}
                      tickFormatter={(value, index) => {
                        const date = new Date(value)
                        
                        // 如果今天应该显示在最右侧，且当前值是今天
                        if (value === today && shouldShowTodayAtEnd) {
                          return '今天'
                        }
                        
                        // 如果今天是第一次记录，且当前值是今天，显示"今天"但不强制在最右侧
                        if (value === today && isFirstRecord) {
                          return '今天'
                        }
                        
                        // 如果今天有数据但不应该显示在最右侧，且当前值是今天，显示日期
                        if (value === today && todayHasData && !shouldShowTodayAtEnd) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        // 数据很少时（<=5天），显示所有有数据的日期
                        if (dataCount <= 5) {
                          if (datesWithData.includes(value)) {
                            return `${date.getMonth() + 1}/${date.getDate()}`
                          }
                          return ''
                        }
                        
                        // 数据较多时，只显示关键日期
                        // 显示第一个日期
                        if (index === 0 && firstDataDate) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        // 每隔约5天显示一个标签
                        if (index % Math.max(1, Math.floor(dataCount / 6)) === 0) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        return ''
                      }}
                    />
                        <YAxis 
                          domain={[0, 5]}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => value.toString()}
                          width={40}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                          labelFormatter={(label) => `日期: ${label}`}
                          formatter={(value: any) => value !== null ? [`${value.toFixed(1)}/5`, '精力'] : ['无数据', '']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="energy" 
                          stroke="hsl(280 70% 50%)" 
                          fill="url(#energyGradient)"
                          strokeWidth={2}
                          connectNulls={false}
                        />
                      </RechartsAreaChart>
                    ) : (
                      <RechartsBarChart data={dailyStats.map((day, idx) => ({
                        date: day.date,
                        dateLabel: idx === dailyStats.length - 1 ? '今天' : idx === 0 ? '30天前' : '',
                        energy: day.avgEnergy !== null && day.completed > 0 ? day.avgEnergy : null,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={shouldShowTodayAtEnd ? "preserveStartEnd" : 0}
                      tickCount={dataCount > 10 ? 8 : dataCount > 5 ? 6 : Math.max(dataCount, 3)}
                      tickFormatter={(value, index) => {
                        const date = new Date(value)
                        
                        // 如果今天应该显示在最右侧，且当前值是今天
                        if (value === today && shouldShowTodayAtEnd) {
                          return '今天'
                        }
                        
                        // 如果今天是第一次记录，且当前值是今天，显示"今天"但不强制在最右侧
                        if (value === today && isFirstRecord) {
                          return '今天'
                        }
                        
                        // 如果今天有数据但不应该显示在最右侧，且当前值是今天，显示日期
                        if (value === today && todayHasData && !shouldShowTodayAtEnd) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        // 数据很少时（<=5天），显示所有有数据的日期
                        if (dataCount <= 5) {
                          if (datesWithData.includes(value)) {
                            return `${date.getMonth() + 1}/${date.getDate()}`
                          }
                          return ''
                        }
                        
                        // 数据较多时，只显示关键日期
                        // 显示第一个日期
                        if (index === 0 && firstDataDate) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        // 每隔约5天显示一个标签
                        if (index % Math.max(1, Math.floor(dataCount / 6)) === 0) {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        return ''
                      }}
                    />
                        <YAxis 
                          domain={[0, 5]}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => value.toString()}
                          width={40}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                          labelFormatter={(label) => `日期: ${label}`}
                          formatter={(value: any) => value !== null ? [`${value.toFixed(1)}/5`, '精力'] : ['无数据', '']}
                        />
                        <Bar 
                          dataKey="energy" 
                          fill="hsl(280 70% 50%)"
                          radius={[4, 4, 0, 0]}
                        />
                      </RechartsBarChart>
                    )}
                  </ResponsiveContainer>
                </div>

                {/* 精力统计 */}
                <div className="pt-6 border-t border-border/50">
                  <div className="grid grid-cols-3 gap-4 md:gap-6">
                    <div className="text-center p-4 rounded-lg bg-purple-500/5 border border-purple-500/10">
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                        {(() => {
                          // 根据"每日唯一行动"，每天只有一条完成记录，avgEnergy 就是当天的精力值
                          const validData = dailyStats.filter(d => d.avgEnergy !== null && d.completed > 0)
                          if (validData.length === 0) return '-'
                          const avg = validData.reduce((sum, d) => sum + (d.avgEnergy || 0), 0) / validData.length
                          return avg.toFixed(1)
                        })()}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">平均精力</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-purple-500/5 border border-purple-500/10">
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                        {(() => {
                          // 只统计有完成记录的日期
                          const validData = dailyStats.filter(d => d.avgEnergy !== null && d.completed > 0)
                          if (validData.length === 0) return '-'
                          const max = Math.max(...validData.map(d => d.avgEnergy || 0))
                          return max.toFixed(1)
                        })()}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">最高精力</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-purple-500/5 border border-purple-500/10">
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                        {(() => {
                          // 只统计有完成记录的日期
                          const validData = dailyStats.filter(d => d.avgEnergy !== null && d.completed > 0)
                          if (validData.length === 0) return '-'
                          const min = Math.min(...validData.map(d => d.avgEnergy || 0))
                          return min.toFixed(1)
                        })()}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">最低精力</div>
                    </div>
                  </div>
                </div>

                {/* 提示 */}
                <div className="pt-2 text-xs text-muted-foreground">
                  <strong>提示：</strong>精力范围 1-5，如果持续下降，可能需要调整计划或休息。
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* 目标进度 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">目标进度</h2>
          {goals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">还没有目标，前往规划页面创建</p>
                <Button
                  className="mt-4"
                  onClick={() => router.push('/goals')}
                >
                  前往规划
                </Button>
              </CardContent>
            </Card>
          ) : (
            goals.map((goal) => (
              <Card key={goal.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{goal.name || '未命名目标'}</CardTitle>
                      <CardDescription>
                        {goal.completedActions !== undefined && goal.totalActions !== undefined
                          ? `${goal.completedActions} / ${goal.totalActions} 个行动已完成`
                          : goal.completedActions !== undefined
                          ? `${goal.completedActions} 个行动已完成`
                          : goal.totalActions !== undefined
                          ? `共 ${goal.totalActions} 个行动`
                          : '暂无行动数据'}
                      </CardDescription>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {goal.category || '未分类'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 进度条 */}
                  {goal.totalActions > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>进度</span>
                        <span className="font-semibold">{goal.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className="bg-gradient-to-r from-primary to-primary/80 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(goal.progress, 0)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      暂无行动，请先创建阶段和行动
                    </div>
                  )}

                  {/* 卡住的阶段 */}
                  {goal.stuckPhases.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">有阶段卡住了</span>
                      </div>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        {goal.stuckPhases.length} 个阶段超过 7 天未完成
                      </p>
                    </div>
                  )}

                  {/* 状态 */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">状态：</span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        goal.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                          : goal.status === 'completed'
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                          : 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {goal.status === 'active'
                        ? '进行中'
                        : goal.status === 'completed'
                        ? '已完成'
                        : '已暂停'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

