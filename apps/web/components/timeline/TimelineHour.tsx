'use client'

import { useState } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { TimelineSlotCard } from './TimelineSlotCard'
import { TimeBlockSegment } from './TimeBlockSegment'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimelineHour as TimelineHourType, TimelineSlot } from '@/types/timeline'

interface TimelineHourProps {
  hour: TimelineHourType
  isCurrentHour?: boolean
  onClick?: (minute: number) => void
  onSlotClick?: (slot: TimelineSlot) => void
}

export function TimelineHour({ 
  hour, 
  isCurrentHour = false, 
  onClick, 
  onSlotClick 
}: TimelineHourProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleHourClick = (e: React.MouseEvent) => {
    if (onClick) {
      const rect = e.currentTarget.getBoundingClientRect()
      const relativeY = e.clientY - rect.top
      const minute = Math.floor((relativeY / rect.height) * 60)
      onClick(Math.max(0, Math.min(59, minute)))
    }
  }

  const getEnergyLevelIcon = () => {
    if (!hour.energy_level) return null
    
    switch (hour.energy_level) {
      case 'high':
        return <Zap className="h-3 w-3 text-yellow-500" />
      case 'medium':
        return <Zap className="h-3 w-3 text-orange-500" />
      case 'low':
        return <Zap className="h-3 w-3 text-gray-400" />
    }
  }

  const getEnergyLevelText = () => {
    if (!hour.energy_level) return ''
    
    switch (hour.energy_level) {
      case 'high':
        return '高'
      case 'medium':
        return '中'
      case 'low':
        return '低'
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-[120px] group transition-all duration-200 relative',
        hour.gradient_class,
        isCurrentHour && 'ring-2 ring-tasktime-500 ring-opacity-50',
        isHovered && 'bg-opacity-80'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hour Label */}
      <div className="w-20 flex-shrink-0 p-3 border-r border-gray-200 flex flex-col items-center justify-start">
        <div className={cn(
          'text-sm font-medium',
          isCurrentHour ? 'text-tasktime-700' : 'text-gray-600'
        )}>
          {hour.display}
        </div>
        
        {/* Working Hours Indicator */}
        {hour.is_working_hour && (
          <Badge variant="outline" className="mt-1 text-xs">
            作業時間
          </Badge>
        )}
        
        {/* Energy Level Indicator */}
        {hour.energy_level && (
          <div className="flex items-center space-x-1 mt-1">
            {getEnergyLevelIcon()}
            <span className="text-xs text-gray-500">
              {getEnergyLevelText()}
            </span>
          </div>
        )}
      </div>

      {/* Hour Content */}
      <div className="flex-1 relative min-h-[120px]">
        {/* Time Block Backgrounds */}
        {hour.time_blocks.map((segment, index) => (
          <TimeBlockSegment
            key={`${segment.time_block.id}-${index}`}
            segment={segment}
            hourHeight={120}
          />
        ))}

        {/* Timeline Slots */}
        <Droppable droppableId={`hour-${hour.hour}`} type="timeline-slot">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                'absolute inset-0 p-2 transition-colors duration-200',
                snapshot.isDraggingOver && 'bg-tasktime-100 bg-opacity-50'
              )}
              onClick={handleHourClick}
            >
              {hour.timeline_slots.map((slot, index) => {
                const startTime = new Date(slot.start_time)
                const endTime = new Date(slot.end_time)
                const startMinute = startTime.getMinutes()
                const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
                
                // Calculate position within the hour
                const topOffset = (startMinute / 60) * 120 // 120px per hour
                const height = Math.max((duration / 60) * 120, 20) // Minimum 20px height
                
                return (
                  <div
                    key={slot.id}
                    className="absolute left-2 right-2"
                    style={{
                      top: `${topOffset}px`,
                      height: `${height}px`
                    }}
                  >
                    <TimelineSlotCard
                      slot={slot}
                      onClick={() => onSlotClick?.(slot)}
                    />
                  </div>
                )
              })}
              
              {provided.placeholder}
              
              {/* Add Task Button */}
              {isHovered && hour.timeline_slots.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-70 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      onClick?.(0)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    タスクを追加
                  </Button>
                </div>
              )}
            </div>
          )}
        </Droppable>

        {/* Hour Grid Lines (15-minute intervals) */}
        <div className="absolute inset-0 pointer-events-none">
          {[15, 30, 45].map((minute) => (
            <div
              key={minute}
              className="absolute left-0 right-0 border-t border-gray-100"
              style={{ top: `${(minute / 60) * 120}px` }}
            />
          ))}
        </div>

        {/* Current Time Indicator (if within this hour) */}
        {isCurrentHour && (() => {
          const now = new Date()
          const currentMinute = now.getMinutes()
          const topOffset = (currentMinute / 60) * 120
          
          return (
            <div 
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: `${topOffset}px` }}
            >
              <div className="h-0.5 bg-red-500 shadow-sm"></div>
              <div className="absolute left-2 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export default TimelineHour