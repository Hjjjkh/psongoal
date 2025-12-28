'use client'

import { useMemo } from 'react'
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
} from 'recharts'
import { RATING_MIN, RATING_MAX } from '@/lib/constants/review'

interface RatingTrendChartProps {
  data: Array<{ date: string; dateLabel?: string; value: number | null }>
  chartType: 'line' | 'area' | 'bar'
  color: string
  gradientId: string
  label: string
  commonXAxisProps: any
  commonCartesianGrid: React.ReactNode
  commonTooltipStyle: React.CSSProperties
}

/**
 * 评分趋势图表组件（难度/精力）
 * 用于减少代码重复
 */
export default function RatingTrendChart({
  data,
  chartType,
  color,
  gradientId,
  label,
  commonXAxisProps,
  commonCartesianGrid,
  commonTooltipStyle,
}: RatingTrendChartProps) {
  const chartData = useMemo(() => data, [data])

  return (
    <ResponsiveContainer width="100%" height="100%">
      {chartType === 'line' ? (
        <RechartsLineChart data={chartData}>
          {commonCartesianGrid}
          <XAxis {...commonXAxisProps} />
          <YAxis
            domain={[RATING_MIN, RATING_MAX]}
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => value.toString()}
            width={40}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={commonTooltipStyle}
            labelFormatter={(label) => `日期: ${label}`}
            formatter={(value: any) =>
              value !== null ? [`${value.toFixed(1)}/${RATING_MAX}`, label] : ['无数据', '']
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </RechartsLineChart>
      ) : chartType === 'area' ? (
        <RechartsAreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {commonCartesianGrid}
          <XAxis {...commonXAxisProps} />
          <YAxis
            domain={[RATING_MIN, RATING_MAX]}
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => value.toString()}
            width={40}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={commonTooltipStyle}
            labelFormatter={(label) => `日期: ${label}`}
            formatter={(value: any) =>
              value !== null ? [`${value.toFixed(1)}/${RATING_MAX}`, label] : ['无数据', '']
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            connectNulls={false}
          />
        </RechartsAreaChart>
      ) : (
        <RechartsBarChart data={chartData}>
          {commonCartesianGrid}
          <XAxis {...commonXAxisProps} />
          <YAxis
            domain={[RATING_MIN, RATING_MAX]}
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => value.toString()}
            width={40}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={commonTooltipStyle}
            labelFormatter={(label) => `日期: ${label}`}
            formatter={(value: any) =>
              value !== null ? [`${value.toFixed(1)}/${RATING_MAX}`, label] : ['无数据', '']
            }
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      )}
    </ResponsiveContainer>
  )
}

