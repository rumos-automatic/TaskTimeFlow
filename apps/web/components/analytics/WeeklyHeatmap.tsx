'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, getDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface HeatmapData {
  date: string
  value: number
  level: number
}

interface WeeklyHeatmapProps {
  data: HeatmapData[]
}

export function WeeklyHeatmap({ data }: WeeklyHeatmapProps) {
  const today = new Date()
  const startDate = new Date(today.getFullYear(), 0, 1) // Start of year
  const endDate = today

  // Create a map for quick lookup
  const dataMap = new Map(data.map(item => [item.date, item]))

  // Generate all weeks for the year
  const weeks: HeatmapData[][] = []
  let currentDate = startOfWeek(startDate, { weekStartsOn: 0 }) // Sunday

  while (currentDate <= endDate) {
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
    const weekDays = eachDayOfInterval({ start: currentDate, end: weekEnd })
    
    const weekData = weekDays.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayData = dataMap.get(dateStr)
      return dayData || {
        date: dateStr,
        value: 0,
        level: 0
      }
    })
    
    weeks.push(weekData)
    currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000) // Next week
  }

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0:
        return 'bg-gray-100'
      case 1:
        return 'bg-green-200'
      case 2:
        return 'bg-green-300'
      case 3:
        return 'bg-green-400'
      case 4:
        return 'bg-green-500'
      default:
        return 'bg-gray-100'
    }
  }

  const getLevelIntensity = (level: number) => {
    switch (level) {
      case 0:
        return 'No activity'
      case 1:
        return 'Low activity'
      case 2:
        return 'Medium activity'
      case 3:
        return 'High activity'
      case 4:
        return 'Very high activity'
      default:
        return 'No activity'
    }
  }

  const dayLabels = ['日', '月', '火', '水', '木', '金', '土']
  const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  // Calculate stats
  const totalDays = data.length
  const activeDays = data.filter(d => d.value > 0).length
  const maxValue = Math.max(...data.map(d => d.value), 0)
  const totalSessions = data.reduce((sum, d) => sum + d.value, 0)

  // Current streak calculation
  let currentStreak = 0
  const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  for (const day of sortedData) {
    if (day.value > 0) {
      currentStreak++
    } else {
      break
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center">
          <Calendar className="h-4 w-4 mr-2 text-green-500" />
          活動ヒートマップ
        </CardTitle>
        <CardDescription>
          年間のポモドーロセッション活動状況
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-green-600">{activeDays}</p>
              <p className="text-xs text-gray-500">活動日数</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{totalSessions}</p>
              <p className="text-xs text-gray-500">総セッション</p>
            </div>
            <div>
              <p className="text-lg font-bold text-purple-600">{maxValue}</p>
              <p className="text-xs text-gray-500">最大/日</p>
            </div>
            <div>
              <p className="text-lg font-bold text-orange-600">{currentStreak}</p>
              <p className="text-xs text-gray-500">連続日数</p>
            </div>
          </div>

          {/* Heatmap */}
          <div className="space-y-2">
            {/* Month labels */}
            <div className="flex text-xs text-gray-500 mb-1">
              {monthLabels.map((month, index) => (
                <div key={index} className="flex-1 text-center">
                  {month}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="overflow-x-auto">
              <div className="flex space-x-1" style={{ minWidth: '600px' }}>
                {/* Day labels */}
                <div className="flex flex-col space-y-1 mr-2">
                  {dayLabels.map((day, index) => (
                    <div key={index} className="h-3 w-6 flex items-center text-xs text-gray-500">
                      {index % 2 === 1 ? day : ''}
                    </div>
                  ))}
                </div>

                {/* Weeks */}
                <div className="flex space-x-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col space-y-1">
                      {week.map((day, dayIndex) => {
                        const isToday = day.date === format(today, 'yyyy-MM-dd')
                        const isCurrentYear = parseISO(day.date).getFullYear() === today.getFullYear()
                        
                        return (
                          <div
                            key={dayIndex}
                            className={cn(
                              'h-3 w-3 rounded-sm cursor-pointer transition-all hover:scale-110',
                              getLevelColor(day.level),
                              isToday && 'ring-2 ring-blue-500',
                              !isCurrentYear && 'opacity-30'
                            )}
                            title={`${format(parseISO(day.date), 'yyyy年MM月dd日', { locale: ja })}: ${day.value}セッション (${getLevelIntensity(day.level)})`}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
              <span>少ない</span>
              <div className="flex items-center space-x-1">
                {[0, 1, 2, 3, 4].map(level => (
                  <div
                    key={level}
                    className={cn('h-3 w-3 rounded-sm', getLevelColor(level))}
                  />
                ))}
              </div>
              <span>多い</span>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="bg-green-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-green-900 mb-2">年間サマリー</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-green-700">総活動日数:</span>
                <span className="font-medium text-green-900">{activeDays}日</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">平均/活動日:</span>
                <span className="font-medium text-green-900">
                  {activeDays > 0 ? (totalSessions / activeDays).toFixed(1) : 0}セッション
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">活動率:</span>
                <span className="font-medium text-green-900">
                  {totalDays > 0 ? ((activeDays / totalDays) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">現在の連続:</span>
                <span className="font-medium text-green-900">{currentStreak}日</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default WeeklyHeatmap