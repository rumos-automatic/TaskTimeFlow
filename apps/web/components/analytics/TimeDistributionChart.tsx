'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Clock, Tag } from 'lucide-react'

interface TimeDistribution {
  category: string
  hours: number
  percentage: number
  color: string
}

interface TimeDistributionChartProps {
  data: TimeDistribution[]
}

export function TimeDistributionChart({ data }: TimeDistributionChartProps) {
  const totalHours = data.reduce((sum, item) => sum + item.hours, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-sm mb-1">{data.payload.category}</p>
          <p className="text-xs text-blue-600 mb-1">
            時間: {data.payload.hours.toFixed(1)}h
          </p>
          <p className="text-xs text-gray-600">
            割合: {data.payload.percentage.toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-sm mb-1">{label}</p>
          <p className="text-xs text-blue-600">
            {payload[0].value.toFixed(1)}時間
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center">
          <Clock className="h-4 w-4 mr-2 text-blue-500" />
          時間配分
        </CardTitle>
        <CardDescription>
          カテゴリ別の作業時間分布
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Pie Chart */}
          {data.length > 0 ? (
            <>
              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-3">時間配分（円グラフ）</h4>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percentage }) => `${percentage.toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="hours"
                      >
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart */}
              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-3">カテゴリ別時間（棒グラフ）</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      type="number" 
                      tick={{ fontSize: 10 }}
                      stroke="#666"
                    />
                    <YAxis 
                      type="category" 
                      dataKey="category"
                      tick={{ fontSize: 10 }}
                      stroke="#666"
                      width={80}
                    />
                    <Tooltip content={<BarTooltip />} />
                    <Bar 
                      dataKey="hours" 
                      fill="#3B82F6"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-3">カテゴリ詳細</h4>
                <div className="grid grid-cols-1 gap-2">
                  {data.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium">{item.category}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{item.hours.toFixed(1)}h</p>
                        <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {totalHours.toFixed(1)}h
                    </p>
                    <p className="text-xs text-gray-500">総作業時間</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {data.length}
                    </p>
                    <p className="text-xs text-gray-500">アクティブカテゴリ</p>
                  </div>
                </div>
              </div>

              {/* Top Category */}
              {data.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Tag className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-900">最も時間を費やしたカテゴリ</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">{data[0].category}</p>
                  <p className="text-xs text-blue-700">
                    {data[0].hours.toFixed(1)}時間 ({data[0].percentage.toFixed(1)}%)
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">時間配分データがありません</p>
              <p className="text-xs text-gray-400">
                タスクを完了すると時間配分が表示されます
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default TimeDistributionChart