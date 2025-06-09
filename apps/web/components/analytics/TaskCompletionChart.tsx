'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

interface DailyStat {
  date: string
  tasks_completed: number
  tasks_created: number
  completion_rate: number
  focus_time: number
  pomodoro_sessions: number
  efficiency_score: number
}

interface TaskCompletionChartProps {
  data: DailyStat[]
  timeRange: 'week' | 'month' | 'quarter' | 'year'
}

export function TaskCompletionChart({ data, timeRange }: TaskCompletionChartProps) {
  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr)
    switch (timeRange) {
      case 'week':
        return format(date, 'MM/dd', { locale: ja })
      case 'month':
        return format(date, 'MM/dd', { locale: ja })
      case 'quarter':
        return format(date, 'MM月', { locale: ja })
      case 'year':
        return format(date, 'MM月', { locale: ja })
      default:
        return format(date, 'MM/dd', { locale: ja })
    }
  }

  interface TooltipPayload {
    name: string
    value: number
    color: string
  }

  const CustomTooltip = ({ active, payload, label }: { 
    active?: boolean; 
    payload?: TooltipPayload[]; 
    label?: string 
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-sm mb-2">{label ? formatDate(label) : ''}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}: </span>
              {entry.name === '完了率' ? `${entry.value.toFixed(1)}%` : `${entry.value}個`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">タスク完了状況</CardTitle>
        <CardDescription>
          {timeRange === 'week' && '今週の'}
          {timeRange === 'month' && '今月の'}
          {timeRange === 'quarter' && '四半期の'}
          {timeRange === 'year' && '今年の'}
          タスク作成・完了トレンド
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Completion Rate Line Chart */}
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-3">完了率推移</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 10 }}
                  stroke="#666"
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                  stroke="#666"
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="completion_rate" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 0, r: 3 }}
                  name="完了率"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tasks Bar Chart */}
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-3">タスク数推移</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 10 }}
                  stroke="#666"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  stroke="#666"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="tasks_created" 
                  fill="#E5E7EB" 
                  name="作成数"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="tasks_completed" 
                  fill="#10B981" 
                  name="完了数"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {data.reduce((sum, day) => sum + day.tasks_completed, 0)}
              </p>
              <p className="text-xs text-gray-500">完了タスク</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {data.reduce((sum, day) => sum + day.tasks_created, 0)}
              </p>
              <p className="text-xs text-gray-500">作成タスク</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {data.length > 0 ? 
                  ((data.reduce((sum, day) => sum + day.completion_rate, 0) / data.length).toFixed(1)) :
                  '0.0'
                }%
              </p>
              <p className="text-xs text-gray-500">平均完了率</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TaskCompletionChart