'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Target, Clock, Award, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductivityTrend {
  metric: string
  current_value: number
  previous_value: number
  change_percentage: number
  trend_direction: 'up' | 'down' | 'stable'
}

interface ProductivityTrendsProps {
  data: ProductivityTrend[]
  timeRange: 'week' | 'month' | 'quarter' | 'year'
}

export function ProductivityTrends({ data, timeRange }: ProductivityTrendsProps) {
  const getTimeLabel = () => {
    switch (timeRange) {
      case 'week': return { current: '今週', previous: '先週' }
      case 'month': return { current: '今月', previous: '先月' }
      case 'quarter': return { current: '今四半期', previous: '前四半期' }
      case 'year': return { current: '今年', previous: '昨年' }
      default: return { current: '今期', previous: '前期' }
    }
  }

  const timeLabels = getTimeLabel()

  const getMetricInfo = (metric: string) => {
    switch (metric) {
      case 'completion_rate':
        return {
          name: 'タスク完了率',
          icon: Target,
          color: 'blue',
          unit: '%'
        }
      case 'focus_time':
        return {
          name: '総作業時間',
          icon: Clock,
          color: 'green',
          unit: 'h'
        }
      case 'efficiency_score':
        return {
          name: '効率スコア',
          icon: Award,
          color: 'yellow',
          unit: ''
        }
      case 'pomodoro_sessions':
        return {
          name: 'ポモドーロセッション',
          icon: BarChart3,
          color: 'purple',
          unit: '回'
        }
      default:
        return {
          name: metric,
          icon: TrendingUp,
          color: 'gray',
          unit: ''
        }
    }
  }

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return TrendingUp
      case 'down':
        return TrendingDown
      case 'stable':
        return Minus
      default:
        return Minus
    }
  }

  const getTrendColor = (direction: 'up' | 'down' | 'stable', isPositiveChange: boolean) => {
    if (direction === 'stable') return 'text-gray-500'
    if (direction === 'up' && isPositiveChange) return 'text-green-500'
    if (direction === 'down' && !isPositiveChange) return 'text-green-500'
    return 'text-red-500'
  }

  const formatValue = (value: number, unit: string) => {
    if (unit === 'h') {
      return `${Math.round(value / 60)}${unit}`
    }
    if (unit === '%') {
      return `${value.toFixed(1)}${unit}`
    }
    return `${Math.round(value)}${unit}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">生産性トレンド</CardTitle>
        <CardDescription>
          {timeLabels.current}と{timeLabels.previous}の比較
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((trend, index) => {
            const metricInfo = getMetricInfo(trend.metric)
            const TrendIcon = getTrendIcon(trend.trend_direction)
            const IconComponent = metricInfo.icon
            
            // Most metrics benefit from being higher (completion rate, focus time, etc.)
            const isPositiveChange = trend.trend_direction === 'up'
            const trendColor = getTrendColor(trend.trend_direction, isPositiveChange)

            return (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    metricInfo.color === 'blue' && 'bg-blue-100',
                    metricInfo.color === 'green' && 'bg-green-100',
                    metricInfo.color === 'yellow' && 'bg-yellow-100',
                    metricInfo.color === 'purple' && 'bg-purple-100',
                    metricInfo.color === 'gray' && 'bg-gray-100'
                  )}>
                    <IconComponent className={cn(
                      'h-4 w-4',
                      metricInfo.color === 'blue' && 'text-blue-500',
                      metricInfo.color === 'green' && 'text-green-500',
                      metricInfo.color === 'yellow' && 'text-yellow-500',
                      metricInfo.color === 'purple' && 'text-purple-500',
                      metricInfo.color === 'gray' && 'text-gray-500'
                    )} />
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm">{metricInfo.name}</h4>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>
                        {timeLabels.previous}: {formatValue(trend.previous_value, metricInfo.unit)}
                      </span>
                      <span>→</span>
                      <span>
                        {timeLabels.current}: {formatValue(trend.current_value, metricInfo.unit)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className={cn('flex items-center space-x-1', trendColor)}>
                    <TrendIcon className="h-4 w-4" />
                    <span className="font-medium text-sm">
                      {trend.change_percentage > 0 ? '+' : ''}
                      {trend.change_percentage.toFixed(1)}%
                    </span>
                  </div>
                  
                  <Badge 
                    variant={
                      trend.trend_direction === 'up' && isPositiveChange ? 'default' :
                      trend.trend_direction === 'down' && !isPositiveChange ? 'default' :
                      trend.trend_direction === 'stable' ? 'outline' : 
                      'destructive'
                    }
                    className="text-xs"
                  >
                    {trend.trend_direction === 'up' && isPositiveChange && '改善'}
                    {trend.trend_direction === 'down' && !isPositiveChange && '改善'}
                    {trend.trend_direction === 'up' && !isPositiveChange && '低下'}
                    {trend.trend_direction === 'down' && isPositiveChange && '低下'}
                    {trend.trend_direction === 'stable' && '横ばい'}
                  </Badge>
                </div>
              </div>
            )
          })}

          {data.length === 0 && (
            <div className="text-center py-8">
              <TrendingUp className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">
                比較期間のデータが不足しています
              </p>
              <p className="text-xs text-gray-400">
                もう少し使用するとトレンドが表示されます
              </p>
            </div>
          )}

          {/* Trend Summary */}
          {data.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-xs font-medium text-gray-600 mb-2">概要</h4>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>改善: {data.filter(t => 
                      (t.trend_direction === 'up') || 
                      (t.trend_direction === 'down' && t.metric === 'completion_time')
                    ).length}項目</span>
                  </div>
                  <div className="flex items-center space-x-1 text-red-600">
                    <TrendingDown className="h-3 w-3" />
                    <span>低下: {data.filter(t => 
                      (t.trend_direction === 'down' && t.metric !== 'completion_time') || 
                      (t.trend_direction === 'up' && t.metric === 'completion_time')
                    ).length}項目</span>
                  </div>
                  <div className="flex items-center space-x-1 text-gray-600">
                    <Minus className="h-3 w-3" />
                    <span>横ばい: {data.filter(t => t.trend_direction === 'stable').length}項目</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ProductivityTrends