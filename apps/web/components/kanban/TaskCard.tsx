'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Clock, 
  AlertTriangle, 
  Calendar, 
  MessageSquare, 
  Paperclip,
  Zap,
  MapPin
} from 'lucide-react'
import { formatTaskDuration, getTaskPriorityColor, isTaskOverdue, getTaskDueDateStatus } from '@/lib/tasks'
import { formatRelativeTime } from '@/lib/utils'
import type { Task } from '@/types/tasks'

interface TaskCardProps {
  task: Task
  isDragging?: boolean
  onClick?: () => void
}

export function TaskCard({ task, isDragging = false, onClick }: TaskCardProps) {
  const dueDateStatus = getTaskDueDateStatus(task)
  const isOverdue = isTaskOverdue(task)

  const getPriorityIcon = () => {
    switch (task.priority) {
      case 'urgent':
        return <AlertTriangle className="h-3 w-3" />
      case 'high':
        return <AlertTriangle className="h-3 w-3" />
      default:
        return null
    }
  }

  const getEnergyIcon = () => {
    switch (task.energy_level) {
      case 'high':
        return <Zap className="h-3 w-3 text-yellow-500" />
      case 'medium':
        return <Zap className="h-3 w-3 text-orange-500" />
      case 'low':
        return <Zap className="h-3 w-3 text-gray-400" />
      default:
        return null
    }
  }

  const getContextIcon = () => {
    switch (task.context) {
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
      default:
        return null
    }
  }

  return (
    <TooltipProvider>
      <Card 
        className={`
          cursor-pointer hover:shadow-lg transition-all duration-200 group
          ${isDragging ? 'shadow-xl border-tasktime-200 bg-tasktime-50' : 'hover:shadow-md'}
          ${isOverdue ? 'border-l-4 border-l-danger-500' : ''}
          ${dueDateStatus === 'due_soon' ? 'border-l-4 border-l-warning-500' : ''}
        `}
        onClick={onClick}
      >
        <CardContent className="p-4">
          {/* Header with priority and assignee */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-1">
              {/* Priority indicator */}
              {(task.priority === 'urgent' || task.priority === 'high') && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className={`p-1 rounded ${getTaskPriorityColor(task.priority)}`}>
                      {getPriorityIcon()}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    優先度: {task.priority === 'urgent' ? '緊急' : 
                            task.priority === 'high' ? '高' :
                            task.priority === 'medium' ? '中' : '低'}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Energy level indicator */}
              {task.energy_level && (
                <Tooltip>
                  <TooltipTrigger>
                    {getEnergyIcon()}
                  </TooltipTrigger>
                  <TooltipContent>
                    エネルギーレベル: {task.energy_level === 'high' ? '高' :
                                   task.energy_level === 'medium' ? '中' : '低'}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Context indicator */}
              {task.context && (
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-sm">{getContextIcon()}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    場所: {task.context === 'pc_required' ? 'PC必須' :
                          task.context === 'anywhere' ? 'どこでも' :
                          task.context === 'home_only' ? '自宅のみ' :
                          task.context === 'office_only' ? 'オフィスのみ' :
                          task.context === 'phone_only' ? 'スマホのみ' : ''}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Assignee avatar */}
            {task.assignee && (
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.avatar_url} alt={task.assignee.display_name} />
                    <AvatarFallback className="text-xs">
                      {task.assignee.display_name?.charAt(0) || task.assignee.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  担当者: {task.assignee.display_name || task.assignee.email}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Task title */}
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-tasktime-700 transition-colors">
            {task.title}
          </h3>

          {/* Task description */}
          {task.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {task.labels.slice(0, 3).map((label) => (
                <Badge key={label} variant="secondary" className="text-xs px-2 py-0">
                  {label}
                </Badge>
              ))}
              {task.labels.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  +{task.labels.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer with metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              {/* Due date */}
              {task.end_time && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className={`flex items-center space-x-1 ${
                      isOverdue ? 'text-danger-600' : 
                      dueDateStatus === 'due_soon' ? 'text-warning-600' : ''
                    }`}>
                      <Calendar className="h-3 w-3" />
                      <span>{formatRelativeTime(task.end_time)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    期限: {new Date(task.end_time).toLocaleString('ja-JP')}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Estimated duration */}
              {task.estimated_duration && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTaskDuration(task.estimated_duration)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    予定時間: {formatTaskDuration(task.estimated_duration)}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {/* Comments count (placeholder) */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <MessageSquare className="h-3 w-3" />
                <span>0</span>
              </div>

              {/* Attachments count (placeholder) */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Paperclip className="h-3 w-3" />
                <span>0</span>
              </div>
            </div>
          </div>

          {/* AI generated indicator */}
          {task.ai_generated && (
            <div className="mt-2 flex items-center space-x-1 text-xs text-tasktime-600">
              <div className="w-2 h-2 bg-tasktime-500 rounded-full animate-pulse"></div>
              <span>AI生成</span>
            </div>
          )}

          {/* Overdue warning */}
          {isOverdue && (
            <div className="mt-2 p-2 bg-danger-50 border border-danger-200 rounded text-xs text-danger-700">
              <div className="flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3" />
                <span>期限を過ぎています</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

export default TaskCard