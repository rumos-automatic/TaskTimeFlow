'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Target, Calendar, CheckCircle, AlertCircle, Plus } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Goal {
  id: string
  name: string
  target_value: number
  current_value: number
  progress_percentage: number
  deadline: string
  status: 'on_track' | 'behind' | 'completed'
}

interface GoalsProgressProps {
  data: Goal[]
}

export function GoalsProgress({ data }: GoalsProgressProps) {
  const getStatusInfo = (status: 'on_track' | 'behind' | 'completed') => {
    switch (status) {
      case 'completed':
        return {
          label: '達成',
          variant: 'default' as const,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          icon: CheckCircle
        }
      case 'on_track':
        return {
          label: '順調',
          variant: 'outline' as const,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          icon: Target
        }
      case 'behind':
        return {
          label: '遅れ',
          variant: 'destructive' as const,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          icon: AlertCircle
        }
    }
  }

  const getDaysRemaining = (deadline: string) => {
    const deadlineDate = parseISO(deadline)
    const today = new Date()
    return differenceInDays(deadlineDate, today)
  }

  const getProgressColor = (progress: number, status: string) => {
    if (status === 'completed') return 'bg-green-500'
    if (status === 'behind') return 'bg-red-500'
    if (progress >= 75) return 'bg-green-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  const completedGoals = data.filter(goal => goal.status === 'completed').length
  const onTrackGoals = data.filter(goal => goal.status === 'on_track').length
  const behindGoals = data.filter(goal => goal.status === 'behind').length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center">
              <Target className="h-4 w-4 mr-2 text-blue-500" />
              目標進捗
            </CardTitle>
            <CardDescription>
              設定した目標の達成状況
            </CardDescription>
          </div>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            目標追加
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{completedGoals}</p>
              <p className="text-xs text-green-700">達成済み</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{onTrackGoals}</p>
              <p className="text-xs text-blue-700">順調</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{behindGoals}</p>
              <p className="text-xs text-red-700">遅れ</p>
            </div>
          </div>

          {/* Goals List */}
          {data.length > 0 ? (
            <div className="space-y-4">
              {data.map((goal) => {
                const statusInfo = getStatusInfo(goal.status)
                const StatusIcon = statusInfo.icon
                const daysRemaining = getDaysRemaining(goal.deadline)
                const progressColor = getProgressColor(goal.progress_percentage, goal.status)

                return (
                  <div key={goal.id} className={cn('p-4 border rounded-lg', statusInfo.bgColor)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <StatusIcon className={cn('h-4 w-4', statusInfo.color)} />
                          <h4 className="font-medium text-sm">{goal.name}</h4>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-600">
                          <span>
                            {goal.current_value} / {goal.target_value}
                          </span>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(parseISO(goal.deadline), 'MM/dd まで', { locale: ja })}
                            </span>
                          </div>
                          <span className={cn(
                            daysRemaining < 0 ? 'text-red-600' :
                            daysRemaining <= 7 ? 'text-orange-600' :
                            'text-gray-600'
                          )}>
                            {daysRemaining < 0 ? `${Math.abs(daysRemaining)}日経過` :
                             daysRemaining === 0 ? '今日まで' :
                             `あと${daysRemaining}日`}
                          </span>
                        </div>
                      </div>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">進捗</span>
                        <span className="font-medium">
                          {Math.min(goal.progress_percentage, 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={cn('h-2 rounded-full transition-all duration-300', progressColor)}
                          style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Additional Info for Overachievers */}
                    {goal.progress_percentage > 100 && (
                      <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
                        <span className="text-yellow-800 font-medium">
                          🎉 目標を{(goal.progress_percentage - 100).toFixed(0)}%上回って達成！
                        </span>
                      </div>
                    )}

                    {/* Warning for Behind Schedule */}
                    {goal.status === 'behind' && daysRemaining > 0 && (
                      <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                        <span className="text-red-800">
                          ⚠️ 目標達成には1日あたり{
                            Math.ceil((goal.target_value - goal.current_value) / daysRemaining)
                          }の進捗が必要です
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 mb-2">目標が設定されていません</p>
              <p className="text-xs text-gray-400 mb-4">
                目標を設定して進捗を追跡しましょう
              </p>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                最初の目標を設定
              </Button>
            </div>
          )}

          {/* Quick Actions */}
          {data.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-xs font-medium text-gray-600 mb-3">クイックアクション</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" className="text-xs">
                  目標を編集
                </Button>
                <Button size="sm" variant="outline" className="text-xs">
                  レポート出力
                </Button>
              </div>
            </div>
          )}

          {/* Achievement Summary */}
          {completedGoals > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium text-sm text-green-900">
                  素晴らしい成果です！
                </span>
              </div>
              <p className="text-xs text-green-800">
                {completedGoals}個の目標を達成しました。継続して新しい目標にチャレンジしましょう！
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default GoalsProgress