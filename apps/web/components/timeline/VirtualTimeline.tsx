'use client'

import { useMemo, useCallback, useState } from 'react'
import { VirtualList } from '@/components/ui/virtual-list'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar, Timer } from 'lucide-react'
import { format, addMinutes, startOfDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { TimelineSlot } from '@/types/timeline'

interface VirtualTimelineProps {
  slots: TimelineSlot[]
  selectedDate: Date
  onSlotClick?: (slot: TimelineSlot) => void
  onSlotDrop?: (slot: TimelineSlot, taskId: string) => void
  timeSlotHeight?: number
  containerHeight?: number
  className?: string
  showEmptySlots?: boolean
  slotDuration?: number // minutes
}

export function VirtualTimeline({
  slots = [],
  selectedDate,
  onSlotClick,
  onSlotDrop,
  timeSlotHeight = 60,
  containerHeight = 600,
  className,
  showEmptySlots = true,
  slotDuration = 30
}: VirtualTimelineProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null)

  // Generate time slots for the day
  const timeSlots = useMemo(() => {
    const startOfDayDate = startOfDay(selectedDate)
    const totalSlots = (24 * 60) / slotDuration // Total 30-minute slots in a day
    
    const generatedSlots = []
    
    for (let i = 0; i < totalSlots; i++) {
      const slotTime = addMinutes(startOfDayDate, i * slotDuration)
      const existingSlot = slots.find(slot => {
        const slotStart = new Date(slot.start_time)
        return slotStart.getHours() === slotTime.getHours() && 
               slotStart.getMinutes() === slotTime.getMinutes()
      })
      
      if (existingSlot) {
        generatedSlots.push(existingSlot)
      } else if (showEmptySlots) {
        generatedSlots.push({
          id: `empty-${i}`,
          start_time: slotTime.toISOString(),
          end_time: addMinutes(slotTime, slotDuration).toISOString(),
          task_id: null,
          task: null,
          is_break: false,
          is_empty: true
        })
      }
    }
    
    return generatedSlots
  }, [selectedDate, slots, showEmptySlots, slotDuration])

  const renderTimeSlot = useCallback((slot: any, index: number, style: React.CSSProperties) => {
    const startTime = new Date(slot.start_time)
    const endTime = new Date(slot.end_time)
    const isCurrentHour = new Date().getHours() === startTime.getHours()
    const isBreak = slot.is_break
    const isEmpty = slot.is_empty
    const hasTask = slot.task

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      if (draggedTask) {
        e.dataTransfer.dropEffect = 'move'
      }
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      if (draggedTask && onSlotDrop) {
        onSlotDrop(slot, draggedTask)
        setDraggedTask(null)
      }
    }

    return (
      <div
        style={style}
        className={cn(
          'border-b border-gray-100 p-2 transition-colors',
          isCurrentHour && 'bg-blue-50 border-blue-200',
          isEmpty && 'hover:bg-gray-50',
          'cursor-pointer'
        )}
        onClick={() => onSlotClick?.(slot)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between h-full">
          {/* Time Label */}
          <div className="flex items-center space-x-2 min-w-0 flex-shrink-0">
            <Clock className="h-4 w-4 text-gray-400" />
            <div className="text-sm">
              <span className={cn(
                'font-medium',
                isCurrentHour ? 'text-blue-600' : 'text-gray-900'
              )}>
                {format(startTime, 'HH:mm', { locale: ja })}
              </span>
              <span className="text-gray-400 mx-1">-</span>
              <span className="text-gray-500 text-xs">
                {format(endTime, 'HH:mm', { locale: ja })}
              </span>
            </div>
          </div>

          {/* Slot Content */}
          <div className="flex-1 ml-4 min-w-0">
            {isEmpty ? (
              <div className="text-gray-400 text-sm italic">
                空き時間
              </div>
            ) : isBreak ? (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-2">
                  <div className="flex items-center space-x-2">
                    <Timer className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      休憩時間
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : hasTask ? (
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {hasTask.title}
                      </h4>
                      <Badge variant={
                        hasTask.priority === 'urgent' ? 'destructive' :
                        hasTask.priority === 'high' ? 'default' :
                        'outline'
                      } className="text-xs">
                        {hasTask.priority}
                      </Badge>
                    </div>
                    
                    {hasTask.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {hasTask.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {hasTask.labels?.map((label, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                      
                      {hasTask.estimated_duration && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Timer className="h-3 w-3" />
                          <span>{hasTask.estimated_duration}分</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-gray-400 text-sm">
                未割り当て
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }, [draggedTask, onSlotClick, onSlotDrop])

  const getSlotKey = useCallback((slot: any, index: number) => {
    return slot.id || `slot-${index}`
  }, [])

  return (
    <div className={cn('bg-white rounded-lg border', className)}>
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">
            {format(selectedDate, 'yyyy年MM月dd日 (EEEE)', { locale: ja })}
          </h3>
          <Badge variant="outline">
            {timeSlots.filter(slot => !slot.is_empty).length} / {timeSlots.length} スロット使用中
          </Badge>
        </div>
      </div>

      {/* Virtual Timeline */}
      <VirtualList
        items={timeSlots}
        itemHeight={timeSlotHeight}
        containerHeight={containerHeight}
        renderItem={renderTimeSlot}
        getItemKey={getSlotKey}
        overscan={3}
        className="border-0"
      />

      {/* Current Time Indicator */}
      <CurrentTimeIndicator 
        selectedDate={selectedDate}
        containerHeight={containerHeight}
        slotHeight={timeSlotHeight}
        slotDuration={slotDuration}
      />
    </div>
  )
}

// Current time indicator component
function CurrentTimeIndicator({ 
  selectedDate, 
  containerHeight, 
  slotHeight, 
  slotDuration 
}: {
  selectedDate: Date
  containerHeight: number
  slotHeight: number
  slotDuration: number
}) {
  const now = new Date()
  const isToday = now.toDateString() === selectedDate.toDateString()
  
  if (!isToday) return null
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const slotsPerHour = 60 / slotDuration
  const currentSlotIndex = Math.floor(currentMinutes / slotDuration)
  const offsetWithinSlot = (currentMinutes % slotDuration) / slotDuration
  
  const topPosition = (currentSlotIndex + offsetWithinSlot) * slotHeight
  
  return (
    <div
      className="absolute left-0 right-0 h-0.5 bg-red-500 z-10 pointer-events-none"
      style={{
        top: topPosition + 64, // Account for header height
      }}
    >
      <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
      <div className="absolute left-4 -top-3 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
        {format(now, 'HH:mm', { locale: ja })}
      </div>
    </div>
  )
}

export default VirtualTimeline