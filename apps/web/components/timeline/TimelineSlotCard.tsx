'use client'

import { Draggable } from 'react-beautiful-dnd'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Clock, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertTriangle,
  Zap,
  MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTimeRange, calculateDuration } from '@/lib/timeline'
import { getTaskPriorityColor, getTaskStatusColor } from '@/lib/tasks'
import type { TimelineSlot } from '@/types/timeline'

interface TimelineSlotCardProps {
  slot: TimelineSlot
  onClick?: () => void
  isDragging?: boolean
}

export function TimelineSlotCard({ slot, onClick, isDragging = false }: TimelineSlotCardProps) {
  const duration = calculateDuration(slot.start_time, slot.end_time)
  const task = slot.task

  const getStatusIcon = () => {
    switch (slot.status) {
      case 'scheduled':
        return <Clock className="h-3 w-3 text-gray-500" />
      case 'in_progress':
        return <Play className="h-3 w-3 text-tasktime-500" />
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-success-500" />
      case 'cancelled':
        return <AlertTriangle className="h-3 w-3 text-danger-500" />
    }
  }

  const getStatusColor = () => {
    switch (slot.status) {
      case 'scheduled':
        return 'border-gray-300 bg-white'
      case 'in_progress':
        return 'border-tasktime-300 bg-tasktime-50'
      case 'completed':
        return 'border-success-300 bg-success-50'
      case 'cancelled':
        return 'border-danger-300 bg-danger-50'
    }
  }

  const getPriorityIcon = () => {
    if (!task?.priority || task.priority === 'medium' || task.priority === 'low') return null
    
    switch (task.priority) {
      case 'urgent':
        return <AlertTriangle className="h-3 w-3 text-danger-500" />
      case 'high':
        return <AlertTriangle className="h-3 w-3 text-warning-500" />
    }
  }

  const getEnergyIcon = () => {
    if (!task?.energy_level) return null
    
    switch (task.energy_level) {
      case 'high':
        return <Zap className="h-3 w-3 text-yellow-500" />
      case 'medium':
        return <Zap className="h-3 w-3 text-orange-500" />
      case 'low':
        return <Zap className="h-3 w-3 text-gray-400" />
    }
  }

  const getContextIcon = () => {
    if (!task?.context) return null
    
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
    }
  }

  return (
    <Draggable draggableId={slot.id} index={0}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
        >
          <Card 
            className={cn(
              'cursor-pointer hover:shadow-md transition-all duration-200 group h-full',
              getStatusColor(),
              (isDragging || snapshot.isDragging) && 'shadow-lg rotate-2 scale-105',
              slot.status === 'in_progress' && 'ring-2 ring-tasktime-500 ring-opacity-50'
            )}
            onClick={onClick}
          >
            <CardContent className="p-3 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-1">
                  {getStatusIcon()}
                  {getPriorityIcon()}
                  {getEnergyIcon()}
                </div>
                
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  {getContextIcon() && (
                    <span>{getContextIcon()}</span>
                  )}
                  <span>{Math.round(duration)}分</span>
                </div>
              </div>

              {/* Task Title */}
              <div className="flex-1 mb-2">
                <h4 className={cn(
                  'text-sm font-medium line-clamp-2 group-hover:text-tasktime-700 transition-colors',
                  slot.status === 'completed' && 'line-through text-gray-500',
                  slot.status === 'cancelled' && 'line-through text-danger-500'
                )}>
                  {task?.title || 'Untitled Task'}
                </h4>
                
                {task?.description && (
                  <p className="text-xs text-gray-600 line-clamp-1 mt-1">
                    {task.description}
                  </p>
                )}
              </div>

              {/* Time Range */}
              <div className="text-xs text-gray-500 mb-2">
                {formatTimeRange(slot.start_time, slot.end_time)}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                {/* Assignee */}
                {task?.assignee && (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.assignee.avatar_url} alt={task.assignee.display_name} />
                    <AvatarFallback className="text-xs">
                      {task.assignee.display_name?.charAt(0) || task.assignee.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}

                {/* Labels */}
                {task?.labels && task.labels.length > 0 && (
                  <div className="flex space-x-1">
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
              </div>

              {/* Progress Bar for In-Progress Tasks */}
              {slot.status === 'in_progress' && slot.actual_start_time && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>進行中</span>
                    <span>
                      {Math.round(
                        (new Date().getTime() - new Date(slot.actual_start_time).getTime()) / (1000 * 60)
                      )}分経過
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-tasktime-500 h-1 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          ((new Date().getTime() - new Date(slot.actual_start_time).getTime()) / 
                           (new Date(slot.end_time).getTime() - new Date(slot.start_time).getTime())) * 100,
                          100
                        )}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* AI Generated Indicator */}
              {task?.ai_generated && (
                <div className="mt-2 flex items-center space-x-1 text-xs text-tasktime-600">
                  <div className="w-1.5 h-1.5 bg-tasktime-500 rounded-full animate-pulse"></div>
                  <span>AI生成</span>
                </div>
              )}

              {/* Sync Status */}
              {slot.google_calendar_event_id && (
                <div className="mt-1 flex items-center space-x-1 text-xs text-gray-500">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>Google同期済み</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  )
}

export default TimelineSlotCard