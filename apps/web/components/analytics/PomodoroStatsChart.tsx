'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Timer, Target, Award } from 'lucide-react'

interface PomodoroStats {
  total_sessions: number
  completed_sessions: number
  average_focus_score: number
  average_session_duration: number
  best_streak: number
  current_streak: number
  daily_goal_achieved: boolean
  sessions_by_time: Array<{
    hour: number
    sessions: number
  }>
}

interface PomodoroStatsChartProps {
  data: PomodoroStats
  timeRange: 'week' | 'month' | 'quarter' | 'year'
}

export function PomodoroStatsChart({ data, timeRange }: PomodoroStatsChartProps) {
  // Prepare data for hourly sessions chart
  const hourlyData = data.sessions_by_time.map(item => ({
    hour: `${item.hour}:00`,
    sessions: item.sessions,
    hourNum: item.hour
  })).filter(item => item.sessions > 0)

  // Prepare data for completion pie chart
  const completionData = [
    { name: '完了', value: data.completed_sessions, color: '#10B981' },
    { name: '未完了', value: data.total_sessions - data.completed_sessions, color: '#EF4444' }
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-sm mb-1">{label}</p>
          <p className="text-xs text-blue-600">
            セッション数: {payload[0].value}回
          </p>
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-sm" style={{ color: data.payload.color }}>
            {data.name}: {data.value}回 ({((data.value / (data.payload.total || 1)) * 100).toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  const getTimeLabel = () => {
    switch (timeRange) {
      case 'week': return '今週'
      case 'month': return '今月'
      case 'quarter': return '四半期'
      case 'year': return '今年'
      default: return ''
    }
  }

  const completionRate = data.total_sessions > 0 ? 
    ((data.completed_sessions / data.total_sessions) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center">
          <Timer className="h-4 w-4 mr-2 text-red-500" />
          ポモドーロ統計
        </CardTitle>
        <CardDescription>
          {getTimeLabel()}のポモドーロセッション分析
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-xs font-medium">完了率</span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {completionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {data.completed_sessions}/{data.total_sessions} セッション
              </p>
            </div>

            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Award className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-xs font-medium">連続記録</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {data.current_streak}
              </p>
              <p className="text-xs text-gray-500">
                最高: {data.best_streak}日
              </p>
            </div>
          </div>

          {/* Session Completion Pie Chart */}
          {data.total_sessions > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-3">セッション完了状況</h4>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={completionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {completionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center space-x-4 mt-2">
                {completionData.map((entry, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-gray-600">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hourly Sessions Chart */}
          {hourlyData.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-3">時間帯別セッション数</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="hour"
                    tick={{ fontSize: 10 }}
                    stroke="#666"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    stroke="#666"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="sessions" 
                    fill="#F59E0B" 
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Focus Quality */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-gray-600">集中状況</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">平均集中スコア</p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${data.average_focus_score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {data.average_focus_score.toFixed(0)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">平均セッション時間</p>
                <p className="text-lg font-bold text-gray-900">
                  {data.average_session_duration.toFixed(0)}分
                </p>
              </div>
            </div>
          </div>

          {/* Goal Achievement */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">今日の目標達成</span>
            <Badge variant={data.daily_goal_achieved ? "default" : "outline"}>
              {data.daily_goal_achieved ? '達成' : '未達成'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PomodoroStatsChart