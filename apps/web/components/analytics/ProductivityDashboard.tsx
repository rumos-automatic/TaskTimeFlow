'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Calendar,
  Award,
  Download,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProductivityAnalytics } from '@/hooks/useAnalytics'
import { TaskCompletionChart } from './TaskCompletionChart'
import { PomodoroStatsChart } from './PomodoroStatsChart'
import { ProductivityTrends } from './ProductivityTrends'
import { TimeDistributionChart } from './TimeDistributionChart'
import { WeeklyHeatmap } from './WeeklyHeatmap'
import { GoalsProgress } from './GoalsProgress'

type TimeRange = 'week' | 'month' | 'quarter' | 'year'

export function ProductivityDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [selectedMetric, setSelectedMetric] = useState('completion_rate')
  
  const { 
    data: analytics, 
    isLoading, 
    refetch 
  } = useProductivityAnalytics(timeRange)

  if (isLoading) {
    return <ProductivityDashboardSkeleton />
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">分析データなし</h3>
        <p className="text-gray-500">タスクやポモドーロセッションを開始すると、統計情報が表示されます。</p>
      </div>
    )
  }

  const handleExportReport = async () => {
    try {
      const response = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timeRange,
          format: 'pdf'
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `productivity-report-${timeRange}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">生産性分析</h1>
          <p className="text-gray-600 mt-1">あなたの作業パターンと生産性を分析します</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">今週</SelectItem>
              <SelectItem value="month">今月</SelectItem>
              <SelectItem value="quarter">四半期</SelectItem>
              <SelectItem value="year">今年</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            レポート出力
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="h-4 w-4 mr-2 text-blue-500" />
              完了率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.overview.completion_rate.toFixed(1)}%
            </div>
            <div className="flex items-center mt-1">
              <TrendingUp className={cn(
                'h-3 w-3 mr-1',
                analytics.overview.completion_rate_change > 0 ? 'text-green-500' : 'text-red-500'
              )} />
              <span className={cn(
                'text-xs',
                analytics.overview.completion_rate_change > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {analytics.overview.completion_rate_change > 0 ? '+' : ''}
                {analytics.overview.completion_rate_change.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2 text-green-500" />
              総作業時間
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analytics.overview.total_focus_time / 60)}h
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.overview.total_focus_time}分
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-purple-500" />
              ポモドーロ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.overview.total_pomodoros}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              セッション完了
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Award className="h-4 w-4 mr-2 text-yellow-500" />
              効率スコア
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.overview.efficiency_score.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              / 100
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="completion" className="space-y-4">
        <TabsList>
          <TabsTrigger value="completion">完了率</TabsTrigger>
          <TabsTrigger value="pomodoro">ポモドーロ</TabsTrigger>
          <TabsTrigger value="trends">トレンド</TabsTrigger>
          <TabsTrigger value="time">時間配分</TabsTrigger>
          <TabsTrigger value="goals">目標進捗</TabsTrigger>
        </TabsList>

        <TabsContent value="completion" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TaskCompletionChart data={analytics.daily_stats} timeRange={timeRange} />
            <WeeklyHeatmap data={analytics.weekly_heatmap} />
          </div>
        </TabsContent>

        <TabsContent value="pomodoro" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PomodoroStatsChart data={analytics.pomodoro_stats} timeRange={timeRange} />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ポモドーロ統計</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {analytics.pomodoro_stats?.average_focus_score.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">平均集中スコア</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {analytics.pomodoro_stats?.best_streak}
                    </p>
                    <p className="text-xs text-gray-500">最長連続記録</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>今日の目標達成</span>
                    <Badge variant={analytics.pomodoro_stats?.daily_goal_achieved ? "default" : "outline"}>
                      {analytics.pomodoro_stats?.daily_goal_achieved ? '達成' : '未達成'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>平均セッション時間</span>
                    <span>{analytics.pomodoro_stats?.average_session_duration}分</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <ProductivityTrends data={analytics.trends} timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TimeDistributionChart data={analytics.time_distribution} />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">時間配分詳細</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.time_distribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.category}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{Math.round(item.hours * 10) / 10}h</p>
                      <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <GoalsProgress data={analytics.goals} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProductivityDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
        </div>
        <div className="flex space-x-3">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-12 bg-gray-200 rounded animate-pulse mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="h-96 bg-gray-200 rounded animate-pulse" />
    </div>
  )
}

export default ProductivityDashboard