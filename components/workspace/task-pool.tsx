'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Plus, Circle, Clock, AlertCircle } from 'lucide-react'

const mockTasks = [
  {
    id: '1',
    title: '新しいランディングページのデザイン',
    priority: 'high',
    category: 'work',
    estimatedTime: '2時間',
    status: 'todo'
  },
  {
    id: '2',
    title: 'プルリクエストのレビュー',
    priority: 'medium',
    category: 'work',
    estimatedTime: '30分',
    status: 'todo'
  },
  {
    id: '3',
    title: '食料品の買い物',
    priority: 'low',
    category: 'personal',
    estimatedTime: '1時間',
    status: 'todo'
  },
]

const priorityColors = {
  high: 'border-red-500 bg-red-50 dark:bg-red-950/20',
  medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
  low: 'border-green-500 bg-green-50 dark:bg-green-950/20'
}

export function TaskPool() {
  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Category Tabs */}
      <div className="flex space-x-2">
        <Button variant="default" size="sm" className="flex-1">
          仕事
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          個人
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          カスタム
        </Button>
      </div>

      <Separator />

      {/* Add Task Button */}
      <Button className="w-full" variant="outline">
        <Plus className="w-4 h-4 mr-2" />
        新しいタスクを追加
      </Button>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {mockTasks.map((task) => (
          <Card
            key={task.id}
            className={`p-4 cursor-move transition-all hover:shadow-md ${
              priorityColors[task.priority as keyof typeof priorityColors]
            }`}
            draggable
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-2">{task.title}</h4>
                <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{task.estimatedTime}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {task.priority === 'high' && <AlertCircle className="w-3 h-3 text-red-500" />}
                    {task.priority === 'medium' && <Circle className="w-3 h-3 text-yellow-500" />}
                    {task.priority === 'low' && <Circle className="w-3 h-3 text-green-500" />}
                    <span className="capitalize">
                      {task.priority === 'high' && '高'}
                      {task.priority === 'medium' && '中'}
                      {task.priority === 'low' && '低'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-2 h-2 bg-current rounded-full opacity-50" />
            </div>
          </Card>
        ))}
      </div>

      {/* Sync Status */}
      <div className="text-xs text-muted-foreground text-center">
        最終同期: 2分前
      </div>
    </div>
  )
}