'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { useTaskStore } from '@/lib/store/use-task-store'

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i
  return {
    time: `${hour.toString().padStart(2, '0')}:00`,
    hour: hour,
    isBusinessHour: hour >= 9 && hour <= 17
  }
})

interface DroppableTimeSlotProps {
  time: string
  hour: number
  isBusinessHour: boolean
  currentHour: number
  scheduledTasks: any[]
}

function DroppableTimeSlot({ time, hour, isBusinessHour, currentHour, scheduledTasks }: DroppableTimeSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `timeline-slot-${time}`
  })

  const tasksAtThisTime = scheduledTasks.filter(slot => {
    if (!slot.startTime) return false
    const slotHour = parseInt(slot.startTime.split(':')[0])
    return slotHour === hour
  })

  return (
    <div
      key={time}
      className={`relative border-b border-border/20 h-16 flex items-start ${
        isBusinessHour ? 'bg-muted/10' : ''
      } ${hour === currentHour ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
    >
      {/* Time Label */}
      <div className="w-16 text-xs text-muted-foreground p-2 font-mono">
        {time}
      </div>

      {/* Drop Zone */}
      <div 
        ref={setNodeRef}
        className={`flex-1 min-h-full border-l border-border/20 p-2 relative transition-colors ${
          isOver ? 'bg-blue-100 dark:bg-blue-950/30 border-blue-300' : ''
        }`}
      >
        {/* Scheduled Tasks at this time */}
        {tasksAtThisTime.map((slot) => {
          const task = scheduledTasks.find(t => t.taskId === slot.taskId)
          if (!task) return null

          return (
            <Card
              key={slot.id}
              className="absolute left-2 right-2 p-2 z-20 bg-blue-100 border-blue-300 dark:bg-blue-950/30"
              style={{ 
                height: `${task.estimatedTime || 60}px`,
                top: '0px'
              }}
            >
              <div className="text-xs font-medium">{task.title}</div>
              <div className="text-xs text-muted-foreground flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {task.estimatedTime || 60}分
              </div>
            </Card>
          )
        })}

        {/* Available Time Slot Indicator */}
        {tasksAtThisTime.length === 0 && (
          <div className={`absolute inset-0 border-2 border-dashed transition-all ${
            isOver 
              ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/20' 
              : 'border-transparent hover:border-border/40'
          }`}>
            <div className={`flex items-center justify-center h-full text-xs transition-opacity ${
              isOver 
                ? 'text-blue-600 opacity-100' 
                : 'text-muted-foreground opacity-0 hover:opacity-100'
            }`}>
              {isOver ? 'ここにドロップ' : 'タスクをドロップ'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function Timeline() {
  const currentHour = new Date().getHours()
  const { timeSlots: scheduledSlots, tasks } = useTaskStore()
  
  // Get today's date for filtering
  const today = new Date()
  const todaySlots = scheduledSlots.filter(slot => {
    // Ensure slot.date is a Date object (handle deserialization)
    const slotDate = slot.date instanceof Date ? slot.date : new Date(slot.date)
    return slotDate.toDateString() === today.toDateString()
  })

  // Combine scheduled tasks with their task details
  const scheduledTasks = todaySlots.map(slot => {
    const task = tasks.find(t => t.id === slot.taskId)
    return { ...slot, ...task }
  }).filter(item => item.title) // Filter out items without task details

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-medium">本日, 6月23日</h3>
          <Button variant="outline" size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button variant="default" size="sm">
            タイムライン
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Timeline Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* Current Time Indicator */}
          <div 
            className="absolute left-0 right-0 border-t-2 border-red-500 z-10"
            style={{ top: `${(currentHour * 60) + new Date().getMinutes()}px` }}
          >
            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-r-md">
              現在
            </div>
          </div>

          {/* Time Slots */}
          {timeSlots.map((slot) => (
            <DroppableTimeSlot
              key={slot.time}
              time={slot.time}
              hour={slot.hour}
              isBusinessHour={slot.isBusinessHour}
              currentHour={currentHour}
              scheduledTasks={scheduledTasks}
            />
          ))}
        </div>
      </div>
    </div>
  )
}