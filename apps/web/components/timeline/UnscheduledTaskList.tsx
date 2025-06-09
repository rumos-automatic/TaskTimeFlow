'use client'

import { useState } from 'react'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle,
  Zap,
  Calendar,
  Plus,
  SortAsc
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatTaskDuration, getTaskPriorityColor } from '@/lib/tasks'
import type { Task } from '@/types/tasks'

interface UnscheduledTaskListProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onTaskSchedule?: (task: Task) => void
}

export function UnscheduledTaskList({ tasks, onTaskClick, onTaskSchedule }: UnscheduledTaskListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'priority' | 'created_at' | 'estimated_duration'>('priority')
  const [filterPriority, setFilterPriority] = useState<string[]>([])

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter(task => {
      const matchesSearch = !searchQuery || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesPriority = filterPriority.length === 0 || 
        filterPriority.includes(task.priority)
      
      return matchesSearch && matchesPriority
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'estimated_duration':
          return (a.estimated_duration || 0) - (b.estimated_duration || 0)
        default:
          return 0
      }
    })

  const getPriorityIcon = (priority: string) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertTriangle className="h-3 w-3" />
    }
    return null
  }

  const getEnergyIcon = (energyLevel?: string) => {
    if (!energyLevel) return null
    
    switch (energyLevel) {
      case 'high':
        return <Zap className="h-3 w-3 text-yellow-500" />
      case 'medium':
        return <Zap className="h-3 w-3 text-orange-500" />
      case 'low':
        return <Zap className="h-3 w-3 text-gray-400" />
    }
  }

  const getContextIcon = (context?: string) => {
    if (!context) return null
    
    switch (context) {
      case 'pc_required':
        return '💻'
      case 'anywhere':
        return '🌍'
      case 'home_only':
        return '🏠'
      case 'office_only':
        return '🏢'
      case 'phone_only':
        return '📱'
    }
  }

  const priorityStats = tasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>未スケジュール</span>
          <Badge variant="secondary">{filteredTasks.length}</Badge>
        </CardTitle>
        
        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="タスクを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <Filter className="h-4 w-4 mr-2" />
                  フィルター
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>優先度</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {['urgent', 'high', 'medium', 'low'].map((priority) => (
                  <DropdownMenuItem
                    key={priority}
                    onClick={() => {
                      setFilterPriority(prev => 
                        prev.includes(priority) 
                          ? prev.filter(p => p !== priority)
                          : [...prev, priority]
                      )
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filterPriority.includes(priority)}
                      className="mr-2"
                      readOnly
                    />
                    {priority === 'urgent' ? '緊急' :
                     priority === 'high' ? '高' :
                     priority === 'medium' ? '中' : '低'}
                    {priorityStats[priority] && (
                      <span className="ml-auto text-gray-500">
                        {priorityStats[priority]}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <SortAsc className="h-4 w-4 mr-2" />
                  並び順
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('priority')}>
                  優先度順
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('created_at')}>
                  作成日順
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('estimated_duration')}>
                  予定時間順
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-4">
          <Droppable droppableId="unscheduled-tasks" type="task">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  'space-y-2 py-2 min-h-full transition-colors duration-200',
                  snapshot.isDraggingOver && 'bg-gray-50'
                )}
              >
                {filteredTasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={provided.draggableProps.style}
                        className={cn(
                          'transition-transform duration-200',
                          snapshot.isDragging && 'rotate-1 scale-105'
                        )}
                      >
                        <Card 
                          className={cn(
                            'cursor-pointer hover:shadow-md transition-all duration-200 group',
                            snapshot.isDragging && 'shadow-lg border-tasktime-200 bg-tasktime-50'
                          )}
                          onClick={() => onTaskClick?.(task)}
                        >
                          <CardContent className="p-3">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-1">
                                {/* Priority */}
                                <div className={cn(
                                  'p-1 rounded',
                                  getTaskPriorityColor(task.priority)
                                )}>
                                  {getPriorityIcon(task.priority)}
                                </div>
                                
                                {/* Energy Level */}
                                {getEnergyIcon(task.energy_level)}
                                
                                {/* Context */}
                                {getContextIcon(task.context) && (
                                  <span className="text-sm">
                                    {getContextIcon(task.context)}
                                  </span>
                                )}
                              </div>
                              
                              {/* Estimated Duration */}
                              {task.estimated_duration && (
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatTaskDuration(task.estimated_duration)}</span>
                                </div>
                              )}
                            </div>

                            {/* Title */}
                            <h4 className="font-medium text-sm mb-2 line-clamp-2 group-hover:text-tasktime-700 transition-colors">
                              {task.title}
                            </h4>

                            {/* Description */}
                            {task.description && (
                              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                {task.description}
                              </p>
                            )}

                            {/* Labels */}
                            {task.labels && task.labels.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {task.labels.slice(0, 2).map((label) => (
                                  <Badge key={label} variant="secondary" className="text-xs px-1 py-0">
                                    {label}
                                  </Badge>
                                ))}
                                {task.labels.length > 2 && (
                                  <Badge variant="secondary" className="text-xs px-1 py-0">
                                    +{task.labels.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Due Date */}
                            {task.end_time && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {new Date(task.end_time).toLocaleDateString('ja-JP')}
                                </span>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div className="text-xs text-gray-500">
                                {task.project?.name}
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onTaskSchedule?.(task)
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                スケジュール
                              </Button>
                            </div>

                            {/* AI Generated Indicator */}
                            {task.ai_generated && (
                              <div className="flex items-center space-x-1 text-xs text-tasktime-600 mt-2">
                                <div className="w-1.5 h-1.5 bg-tasktime-500 rounded-full animate-pulse"></div>
                                <span>AI生成</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                
                {filteredTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <Calendar className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm text-center">
                      {searchQuery || filterPriority.length > 0 
                        ? '条件に一致するタスクがありません'
                        : '未スケジュールのタスクはありません'
                      }
                    </p>
                    {(searchQuery || filterPriority.length > 0) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setSearchQuery('')
                          setFilterPriority([])
                        }}
                      >
                        フィルターをクリア
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default UnscheduledTaskList