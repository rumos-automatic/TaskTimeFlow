'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calendar, ChevronLeft, ChevronRight, Clock, Edit2, Trash2, X } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTaskStore } from '@/lib/store/use-task-store'

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i
  return {
    time: `${hour.toString().padStart(2, '0')}:00`,
    hour: hour,
    isBusinessHour: hour >= 9 && hour <= 17
  }
})

interface ScheduledTaskCardProps {
  task: any
  slotId: string
  slotData: any
}

function ScheduledTaskCard({ task, slotId, slotData }: ScheduledTaskCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const { updateTask, removeTimeSlot } = useTaskStore()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `scheduled-${task.id}-${slotId}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const handleEdit = () => {
    setIsEditing(true)
    setShowActions(false)
  }

  const handleDelete = () => {
    removeTimeSlot(slotId)
    setShowActions(false)
  }

  if (isEditing) {
    return (
      <EditScheduledTaskCard 
        task={task}
        slot={slotData}
        onSave={(updatedTask) => {
          updateTask(task.id, updatedTask)
          setIsEditing(false)
        }}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className="absolute left-2 right-2 p-2 z-20 bg-blue-100 border-blue-300 dark:bg-blue-950/30 hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors group"
        style={{ 
          height: `${slotData.estimatedTime || 60}px`,
          top: '0px'
        }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="relative h-full">
          {/* ドラッグ可能エリア */}
          <div 
            {...listeners}
            className="cursor-move h-full w-full absolute inset-0"
          />
          
          {/* コンテンツエリア */}
          <div className="relative h-full pointer-events-none">
            <div className="text-xs font-medium">{task.title}</div>
            <div className="text-xs text-muted-foreground flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {slotData.estimatedTime || 60}分
            </div>
          </div>
          
          {/* アクションボタン */}
          {showActions && (
            <div className="absolute top-1 right-1 flex space-x-1 pointer-events-auto z-10">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-blue-200 dark:hover:bg-blue-800"
                onClick={handleEdit}
              >
                <Edit2 className="w-2.5 h-2.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-red-200 dark:hover:bg-red-800 text-red-600"
                onClick={handleDelete}
              >
                <Trash2 className="w-2.5 h-2.5" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

interface EditScheduledTaskCardProps {
  task: any
  slot: any
  onSave: (task: any) => void
  onCancel: () => void
}

function EditScheduledTaskCard({ task, slot, onSave, onCancel }: EditScheduledTaskCardProps) {
  const [formData, setFormData] = useState({
    title: task.title,
    priority: task.priority,
    category: task.category,
    estimatedTime: task.estimatedTime as number | ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    // 空文字列の場合はデフォルト値を設定
    const finalData = {
      ...formData,
      estimatedTime: formData.estimatedTime === '' ? 30 : formData.estimatedTime
    }
    onSave(finalData)
  }

  return (
    <div className="absolute left-2 right-2 z-20" style={{ top: '0px' }}>
      <Card className="p-3 border-primary bg-white dark:bg-gray-800">
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-2 py-1 border border-border rounded text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
            required
          />

          <div className="grid grid-cols-3 gap-1">
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className="px-1 py-1 border border-border rounded text-xs bg-background"
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>

            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="px-1 py-1 border border-border rounded text-xs bg-background"
            >
              <option value="work">仕事</option>
              <option value="personal">個人</option>
              <option value="custom">カスタム</option>
            </select>

            <input
              type="number"
              min="5"
              max="480"
              value={formData.estimatedTime}
              onChange={(e) => {
                const value = e.target.value
                setFormData(prev => ({ 
                  ...prev, 
                  estimatedTime: value === '' ? '' : (parseInt(value) || 30)
                }))
              }}
              className="px-1 py-1 border border-border rounded text-xs bg-background"
              placeholder="分"
            />
          </div>

          <div className="flex space-x-1">
            <Button type="submit" size="sm" className="flex-1 h-6 text-xs">
              保存
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={onCancel}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

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

  const tasksAtThisTime = scheduledTasks.filter(item => {
    if (!item.slotData.startTime) return false
    const slotHour = parseInt(item.slotData.startTime.split(':')[0])
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
        {tasksAtThisTime.map((item) => {
          return (
            <ScheduledTaskCard
              key={item.slotId}
              task={item.task}
              slotId={item.slotId}
              slotData={item.slotData}
            />
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
    return { 
      task: task,
      slotId: slot.id,
      slotData: {
        startTime: slot.startTime,
        endTime: slot.endTime,
        date: slot.date,
        type: slot.type,
        estimatedTime: task?.estimatedTime || 60
      }
    }
  }).filter(item => item.task?.title) // Filter out items without task details

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