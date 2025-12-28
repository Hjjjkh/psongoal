'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GoalWithStats, DayData, Insight } from '@/lib/insights'
import { TrendingUp, AlertCircle, BarChart3, LineChart, AreaChart, Lightbulb, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
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
import { REVIEW_DAYS_RANGE, RATING_MIN, RATING_MAX, STUCK_PHASE_THRESHOLD_DAYS } from '@/lib/constants/review'
import { formatDateForDisplay, isToday, isYesterday } from '@/lib/utils/date'
import RatingTrendChart from '@/components/charts/rating-trend-chart'

interface ExecutionHistory {
  id: string
  action_id: string
  date: string
  completed: boolean
  difficulty: number | null
  energy: number | null
  actions: {
    id: string
    title: string
    definition: string
    phases: {
      id: string
      name: string
      goals: {
        id: string
        name: string
      }
    }
  }
}

interface DashboardViewProps {
  goals: GoalWithStats[]
  consecutiveDays: number
  dailyStats: DayData[]
  hasCurrentAction: boolean
  todayCompleted: boolean
  insights: Insight[]
  reminderEnabled?: boolean | null
  reminderTime?: string | null
  recentExecutions?: ExecutionHistory[]
}

type ChartType = 'line' | 'area' | 'bar'

export default function DashboardView({ goals, consecutiveDays, dailyStats, hasCurrentAction, todayCompleted, insights, reminderEnabled, reminderTime, recentExecutions = [] }: DashboardViewProps) {
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

  // X轴标签格式化函数（提取公共函数，避免重复代码）
  const formatXAxisLabel = (value: string) => {
    const date = new Date(value)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateForCompare = new Date(value)
    dateForCompare.setHours(0, 0, 0, 0)
    
    if (dateForCompare.getTime() === today.getTime()) {
      return '今天'
    }
    
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}/${day}`
  }

  // 公共的图表配置（提取重复代码）
  const commonXAxisProps = {
    dataKey: 'date' as const,
    tick: { fontSize: 10 },
    angle: -45,
    textAnchor: 'end' as const,
    height: 60,
    interval: shouldShowTodayAtEnd ? ("preserveStartEnd" as const) : 0,
    tickCount: dataCount > 10 ? 8 : dataCount > 5 ? 6 : Math.max(dataCount, 3),
    tickFormatter: formatXAxisLabel,
  }

  const commonTooltipStyle = {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
    fontSize: '12px',
  }

  const commonCartesianGrid = <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

  // 计算周/月统计（添加更多统计指标）
  const weeklyStats = useMemo(() => {
    const now = new Date()
    const thisWeekStart = new Date(now)
    thisWeekStart.setDate(now.getDate() - now.getDay())
    thisWeekStart.setHours(0, 0, 0, 0)
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    
    const thisWeekData = dailyStats.filter(d => {
      const date = new Date(d.date)
      return date >= thisWeekStart
    })
    const lastWeekData = dailyStats.filter(d => {
      const date = new Date(d.date)
      return date >= lastWeekStart && date < thisWeekStart
    })
    
    const thisWeekCompleted = thisWeekData.filter(d => d.completed > 0).length
    const lastWeekCompleted = lastWeekData.filter(d => d.completed > 0).length
    // 【修复】total 应该是有记录的天数，而不是所有天数
    const thisWeekTotal = thisWeekData.filter(d => d.total > 0).length
    const lastWeekTotal = lastWeekData.filter(d => d.total > 0).length
    
    return {
      thisWeek: {
        completed: thisWeekCompleted,
        total: thisWeekTotal,
        rate: thisWeekTotal > 0 ? Math.round((thisWeekCompleted / thisWeekTotal) * 100) : 0,
      },
      lastWeek: {
        completed: lastWeekCompleted,
        total: lastWeekTotal,
        rate: lastWeekTotal > 0 ? Math.round((lastWeekCompleted / lastWeekTotal) * 100) : 0,
      },
      trend: thisWeekCompleted > lastWeekCompleted ? 'up' : thisWeekCompleted < lastWeekCompleted ? 'down' : 'same',
    }
  }, [dailyStats])

  const monthlyStats = useMemo(() => {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    
    const thisMonthData = dailyStats.filter(d => {
      const date = new Date(d.date)
      return date >= thisMonthStart
    })
    const lastMonthData = dailyStats.filter(d => {
      const date = new Date(d.date)
      return date >= lastMonthStart && date <= lastMonthEnd
    })
    
    const thisMonthCompleted = thisMonthData.filter(d => d.completed > 0).length
    const lastMonthCompleted = lastMonthData.filter(d => d.completed > 0).length
    // 【修复】total 应该是有记录的天数，而不是所有天数
    const thisMonthTotal = thisMonthData.filter(d => d.total > 0).length
    const lastMonthTotal = lastMonthData.filter(d => d.total > 0).length
    
    return {
      thisMonth: {
        completed: thisMonthCompleted,
        total: thisMonthTotal,
        rate: thisMonthTotal > 0 ? Math.round((thisMonthCompleted / thisMonthTotal) * 100) : 0,
      },
      lastMonth: {
        completed: lastMonthCompleted,
        total: lastMonthTotal,
        rate: lastMonthTotal > 0 ? Math.round((lastMonthCompleted / lastMonthTotal) * 100) : 0,
      },
      trend: thisMonthCompleted > lastMonthCompleted ? 'up' : thisMonthCompleted < lastMonthCompleted ? 'down' : 'same',
    }
  }, [dailyStats])

  // 优化：缓存图表数据，避免每次渲染都重新计算
  const completionChartData = useMemo(() => 
    dailyStats.map((day, idx) => ({
      date: day.date,
      dateLabel: idx === dailyStats.length - 1 ? '今天' : idx === 0 ? `${REVIEW_DAYS_RANGE}天前` : '',
      completed: day.completed > 0 ? 1 : 0,
      hasRecord: day.total > 0 ? 1 : 0,
    })), 
    [dailyStats]
  )

  const difficultyChartData = useMemo(() => 
    dailyStats.map((day, idx) => ({
      date: day.date,
      dateLabel: idx === dailyStats.length - 1 ? '今天' : idx === 0 ? `${REVIEW_DAYS_RANGE}天前` : '',
      value: day.avgDifficulty !== null && day.completed > 0 ? day.avgDifficulty : null,
    })), 
    [dailyStats]
  )

  const energyChartData = useMemo(() => 
    dailyStats.map((day, idx) => ({
      date: day.date,
      dateLabel: idx === dailyStats.length - 1 ? '今天' : idx === 0 ? `${REVIEW_DAYS_RANGE}天前` : '',
      value: day.avgEnergy !== null && day.completed > 0 ? day.avgEnergy : null,
    })), 
    [dailyStats]
  )

  // 优化：提取统计计算逻辑，减少重复代码
  const difficultyStats = useMemo(() => {
    const validData = dailyStats.filter(d => d.avgDifficulty !== null && d.completed > 0)
    if (validData.length === 0) {
      return { avg: '-', max: '-', min: '-' }
    }
    const values = validData.map(d => d.avgDifficulty || 0)
    return {
      avg: (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1),
      max: Math.max(...values).toFixed(1),
      min: Math.min(...values).toFixed(1),
    }
  }, [dailyStats])

  const energyStats = useMemo(() => {
    const validData = dailyStats.filter(d => d.avgEnergy !== null && d.completed > 0)
    if (validData.length === 0) {
      return { avg: '-', max: '-', min: '-' }
    }
    const values = validData.map(d => d.avgEnergy || 0)
    return {
      avg: (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1),
      max: Math.max(...values).toFixed(1),
      min: Math.min(...values).toFixed(1),
    }
  }, [dailyStats])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6 pt-20">
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

        {/* 行动历史记录 */}

        {/* 智能建议卡片 */}
        {insights.length > 0 && (
          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                智能建议
              </CardTitle>
              <CardDescription className="mt-1">
                基于你的执行数据生成的个性化改进建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight, index) => {
                  const iconMap = {
                    success: CheckCircle2,
                    warning: AlertTriangle,
                    info: Info,
                    suggestion: Lightbulb,
                  }
                  const Icon = iconMap[insight.type]
                  
                  const colorMap = {
                    success: 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20',
                    warning: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20',
                    info: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
                    suggestion: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
                  }
                  
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${colorMap[insight.type]} transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 space-y-1">
                          <h4 className="font-semibold text-sm">{insight.title}</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {insight.description}
                          </p>
                          {insight.action && (
                            <Button
                              onClick={() => router.push('/today')}
                              variant="outline"
                              size="sm"
                              className="mt-2"
                            >
                              {insight.action}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 图表区域 */}
        <div className="space-y-6 md:space-y-8">
          {/* 最近30天完成趋势 */}
          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    最近{REVIEW_DAYS_RANGE}天完成趋势
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
                  <RechartsBarChart data={completionChartData}>
                    {commonCartesianGrid}
                    <XAxis {...commonXAxisProps} />
                    <YAxis 
                      domain={[0, 1]}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => value === 1 ? '完成' : ''}
                      hide
                    />
                    <Tooltip 
                      contentStyle={commonTooltipStyle}
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
                    {dailyStats.filter(d => d.completed > 0).length} / {REVIEW_DAYS_RANGE} 天有完成
                  </span>
                </div>
                <div className="flex gap-1 h-10 items-end">
                  {dailyStats.map((day, index) => {
                    const hasCompleted = day.completed > 0
                    const isTodayIndex = index === dailyStats.length - 1
                    const height = hasCompleted ? 100 : (day.total > 0 ? 25 : 8)
                    const bgColor = hasCompleted
                      ? 'bg-green-500 dark:bg-green-600'
                      : isTodayIndex && !hasCompleted && hasCurrentAction
                      ? 'bg-orange-500 dark:bg-orange-600'
                      : day.total > 0
                      ? 'bg-red-500 dark:bg-red-600'
                      : 'bg-muted'
                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center gap-0.5"
                        title={`${day.date}${isTodayIndex ? ' (今天)' : ''}: ${hasCompleted ? '已完成' : day.total > 0 ? '未完成' : '无记录'}`}
                      >
                        <div
                          className={`w-full rounded-t transition-all hover:opacity-80 ${isTodayIndex ? 'ring-2 ring-offset-1 ring-primary' : ''} ${bgColor}`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{REVIEW_DAYS_RANGE}天前</span>
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
                      <div className="text-sm text-muted-foreground mt-2 font-medium">完成天数</div>
                      <div className="text-xs text-muted-foreground mt-1">（30天内）</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-green-500/5 border border-green-500/10">
                      <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                        {daysWithRecords}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">有记录天数</div>
                      <div className="text-xs text-muted-foreground mt-1">（包含未完成）</div>
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

              {/* 周/月对比统计 */}
              {(weeklyStats.thisWeek.total > 0 || monthlyStats.thisMonth.total > 0) && (
                <div className="pt-6 border-t border-border/50 space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground">周期对比</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* 本周 vs 上周 */}
                    {weeklyStats.thisWeek.total > 0 && (
                      <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">本周完成</span>
                          {weeklyStats.trend === 'up' && (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">↑ 提升</span>
                          )}
                          {weeklyStats.trend === 'down' && (
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium">↓ 下降</span>
                          )}
                          {weeklyStats.trend === 'same' && (
                            <span className="text-xs text-muted-foreground font-medium">→ 持平</span>
                          )}
                        </div>
                        <div className="text-2xl font-bold">{weeklyStats.thisWeek.completed} / {weeklyStats.thisWeek.total}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          上周: {weeklyStats.lastWeek.completed} / {weeklyStats.lastWeek.total}
                        </div>
                      </div>
                    )}
                    {/* 本月 vs 上月 */}
                    {monthlyStats.thisMonth.total > 0 && (
                      <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">本月完成</span>
                          {monthlyStats.trend === 'up' && (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">↑ 提升</span>
                          )}
                          {monthlyStats.trend === 'down' && (
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium">↓ 下降</span>
                          )}
                          {monthlyStats.trend === 'same' && (
                            <span className="text-xs text-muted-foreground font-medium">→ 持平</span>
                          )}
                        </div>
                        <div className="text-2xl font-bold">{monthlyStats.thisMonth.completed} / {monthlyStats.thisMonth.total}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          上月: {monthlyStats.lastMonth.completed} / {monthlyStats.lastMonth.total}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
              <div className="text-center py-12 space-y-4">
                <div className="text-5xl mb-4">📊</div>
                <p className="text-lg font-semibold">还没有难度数据</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  完成行动时填写难度评分后，这里会显示难度趋势图表
                </p>
                {hasCurrentAction && !todayCompleted && (
                  <Button 
                    onClick={() => router.push('/today')} 
                    size="lg"
                    className="mt-4"
                  >
                    去完成今日行动
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* 难度趋势图表 */}
                <div className="h-64 w-full">
                  <RatingTrendChart
                    data={difficultyChartData}
                    chartType={difficultyChartType}
                    color="hsl(var(--primary))"
                    gradientId="difficultyGradient"
                    label="难度"
                    commonXAxisProps={commonXAxisProps}
                    commonCartesianGrid={commonCartesianGrid}
                    commonTooltipStyle={commonTooltipStyle}
                  />
                </div>

                {/* 难度统计 */}
                <div className="pt-6 border-t border-border/50">
                  <div className="grid grid-cols-3 gap-4 md:gap-6">
                    <div className="text-center p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                        {difficultyStats.avg}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">平均难度</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                        {difficultyStats.max}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">最高难度</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                        {difficultyStats.min}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">最低难度</div>
                    </div>
                  </div>
                </div>

                {/* 提示 */}
                <div className="pt-2 text-xs text-muted-foreground">
                  <strong>提示：</strong>难度范围 {RATING_MIN}-{RATING_MAX}，如果持续上升，可能需要调整计划。
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
              <div className="text-center py-12 space-y-4">
                <div className="text-5xl mb-4">⚡</div>
                <p className="text-lg font-semibold">还没有精力数据</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  完成行动时填写精力评分后，这里会显示精力趋势图表
                </p>
                {hasCurrentAction && !todayCompleted && (
                  <Button 
                    onClick={() => router.push('/today')} 
                    size="lg"
                    className="mt-4"
                  >
                    去完成今日行动
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* 精力趋势图表 */}
                <div className="h-64 w-full">
                  <RatingTrendChart
                    data={energyChartData}
                    chartType={energyChartType}
                    color="hsl(280 70% 50%)"
                    gradientId="energyGradient"
                    label="精力"
                    commonXAxisProps={commonXAxisProps}
                    commonCartesianGrid={commonCartesianGrid}
                    commonTooltipStyle={commonTooltipStyle}
                  />
                </div>

                {/* 精力统计 */}
                <div className="pt-6 border-t border-border/50">
                  <div className="grid grid-cols-3 gap-4 md:gap-6">
                    <div className="text-center p-4 rounded-lg bg-purple-500/5 border border-purple-500/10">
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                        {energyStats.avg}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">平均精力</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-purple-500/5 border border-purple-500/10">
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                        {energyStats.max}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">最高精力</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-purple-500/5 border border-purple-500/10">
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                        {energyStats.min}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium">最低精力</div>
                    </div>
                  </div>
                </div>

                {/* 提示 */}
                <div className="pt-2 text-xs text-muted-foreground">
                  <strong>提示：</strong>精力范围 {RATING_MIN}-{RATING_MAX}，如果持续下降，可能需要调整计划或休息。
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* 行动历史记录 */}
        {recentExecutions.length > 0 && (
          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    最近完成记录
                  </CardTitle>
                  <CardDescription>
                    查看最近完成的行动记录{recentExecutions.length > 10 ? `（显示最近 10 条，共 ${recentExecutions.length} 条）` : `（共 ${recentExecutions.length} 条）`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentExecutions.slice(0, 10).map((execution) => {
                  const action = execution.actions
                  const phase = action?.phases
                  const goal = phase?.goals
                  // 优化：使用统一的日期格式化工具
                  const executionDate = new Date(execution.date)
                  const dateStr = formatDateForDisplay(execution.date)
                  
                  // 判断是否是今天或昨天
                  const isTodayDate = isToday(execution.date)
                  const isYesterdayDate = isYesterday(execution.date)
                  
                  let displayDate = dateStr
                  if (isTodayDate) {
                    displayDate = '今天'
                  } else if (isYesterdayDate) {
                    displayDate = '昨天'
                  }
                  
                  return (
                    <div
                      key={execution.id}
                      className="p-4 rounded-lg border bg-background/50 hover:bg-muted/50 transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm mb-1.5 truncate">
                            {action?.title || '未知行动'}
                          </div>
                          <div className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {action?.definition || '无描述'}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                              {goal?.name || '未知目标'}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{phase?.name || '未知阶段'}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className={`font-medium ${isTodayDate ? 'text-primary' : isYesterdayDate ? 'text-primary/80' : 'text-muted-foreground'}`}>
                              {displayDate}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-xs flex-shrink-0">
                          {execution.difficulty !== null && (
                            <div className="px-2 py-1 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium">
                              难度: {execution.difficulty}/5
                            </div>
                          )}
                          {execution.energy !== null && (
                            <div className="px-2 py-1 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium">
                              精力: {execution.energy}/5
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {recentExecutions.length > 10 && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      toast.info(`共 ${recentExecutions.length} 条记录，当前显示最近 10 条。完整历史记录功能开发中...`)
                    }}
                  >
                    查看全部 {recentExecutions.length} 条记录
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 目标进度 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">目标进度</h2>
              <p className="text-sm text-muted-foreground mt-1">
                查看所有目标的执行进度和状态
              </p>
            </div>
            {goals.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/goals')}
              >
                管理目标
              </Button>
            )}
          </div>
          {goals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-4">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-lg font-semibold">还没有目标</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  创建目标后，这里会显示你的执行进度和统计信息
                </p>
                <Button
                  onClick={() => router.push('/goals')}
                  size="lg"
                  className="mt-4"
                >
                  前往规划页面创建目标
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {goals.map((goal) => {
                const categoryMap: Record<string, { label: string; color: string }> = {
                  health: { label: '健康', color: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' },
                  learning: { label: '学习', color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200' },
                  project: { label: '项目', color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200' },
                }
                const categoryInfo = categoryMap[goal.category] || { label: '未分类', color: 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200' }
                
                return (
                <Card key={goal.id} className="hover:shadow-lg transition-all duration-300 border-border/50">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{goal.name || '未命名目标'}</CardTitle>
                        <CardDescription className="mt-1">
                          {goal.completedActions !== undefined && goal.totalActions !== undefined
                            ? `${goal.completedActions} / ${goal.totalActions} 个行动已完成`
                            : goal.completedActions !== undefined
                            ? `${goal.completedActions} 个行动已完成`
                            : goal.totalActions !== undefined
                            ? `共 ${goal.totalActions} 个行动`
                            : '暂无行动数据'}
                        </CardDescription>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${categoryInfo.color}`}>
                        {categoryInfo.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 进度条 */}
                    {goal.totalActions > 0 ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">进度</span>
                          <span className="font-bold text-lg">{goal.progress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-1"
                            style={{ width: `${Math.max(goal.progress, 0)}%` }}
                          >
                            {goal.progress > 10 && (
                              <span className="text-[10px] text-primary-foreground font-medium">
                                {goal.progress}%
                              </span>
                            )}
                          </div>
                        </div>
                        {goal.progress === 100 && (
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium text-center">
                            🎉 目标已完成！
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 border border-dashed rounded-lg bg-muted/30">
                        <p className="text-sm text-muted-foreground mb-2">暂无行动</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/goals')}
                        >
                          添加阶段和行动
                        </Button>
                      </div>
                    )}

                    {/* 日期信息 */}
                    {(goal.start_date || goal.end_date) && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        {goal.start_date && (
                          <div>开始日期：{formatDateForDisplay(goal.start_date)}</div>
                        )}
                        {goal.end_date && (
                          <div>结束日期：{formatDateForDisplay(goal.end_date)}</div>
                        )}
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
                          {goal.stuckPhases.length} 个阶段超过 {STUCK_PHASE_THRESHOLD_DAYS} 天未完成，建议检查并调整计划
                        </p>
                      </div>
                    )}

                    {/* 状态和操作 */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">状态：</span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/goals')}
                        className="text-xs"
                      >
                        查看详情 →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

