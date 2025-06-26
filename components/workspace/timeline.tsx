'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calendar, ChevronLeft, ChevronRight, Clock, Edit2, Trash2, X, Check } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTaskStore } from '@/lib/store/use-task-store'

const timeSlots = Array.from({ length: 96 }, (_, i) => {
  const hour = Math.floor(i / 4)
  const minute = (i % 4) * 15
  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  return {
    time: timeString,
    hour: hour,
    minute: minute,
    slotIndex: i,
    isBusinessHour: hour >= 9 && hour <= 17,
    isHourStart: minute === 0,
    isHalfHour: minute === 30
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
  const { updateTask, removeTimeSlot, completeTask } = useTaskStore()
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

  const handleComplete = () => {
    completeTask(task.id)
    // 完了タスクはタイムライン上にグレーアウトして残す（削除しない）
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

  const isCompleted = task.status === 'completed'
  
  return (
    <div ref={setNodeRef} style={style}>
      <Card
        {...(!isCompleted ? { ...listeners, ...attributes } : {})}
        className={`absolute left-2 right-2 p-2 transition-colors group ${!isCompleted ? 'cursor-move' : ''} ${
          isDragging ? 'z-50 shadow-2xl scale-105' : 'z-20'
        } ${
          isCompleted 
            ? 'bg-muted/50 border-muted opacity-60' 
            : 'bg-blue-100 border-blue-300 dark:bg-blue-950/30 hover:bg-blue-200 dark:hover:bg-blue-900/40'
        }`}
        style={{ 
          height: `${(() => {
            const minutes = slotData.estimatedTime || 60
            const slots = Math.ceil(minutes / 15)
            let totalHeight = 0
            
            // タスクの開始時刻から必要なスロット数分の高さを計算
            const [startHour, startMinute] = slotData.startTime.split(':').map(Number)
            const startSlotIndex = startHour * 4 + Math.floor(startMinute / 15)
            
            for (let i = 0; i < slots; i++) {
              const currentSlotIndex = startSlotIndex + i
              const currentMinute = (currentSlotIndex % 4) * 15
              totalHeight += currentMinute === 0 ? 64 : 40 // h-16 or h-10
            }
            
            // パディング分を考慮して少し減らす
            return totalHeight - 4
          })()}px`,
          top: '0px'
        }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="relative h-full">
          {/* コンテンツエリア */}
          <div className="relative h-full pointer-events-none">
            <div className={`text-xs font-medium mb-1 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </div>
            <div className="flex items-center space-x-1 text-xs">
              {/* 優先度バッジ */}
              <div className={`px-1 py-0.5 rounded text-xs ${
                task.priority === 'high' ? 'bg-red-100 text-red-700' :
                'bg-green-100 text-green-700'
              }`}>
                優先度：{task.priority === 'high' ? '高' : '低'}
              </div>
              {/* 緊急度バッジ */}
              <div className={`px-1 py-0.5 rounded text-xs ${
                task.urgency === 'high' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                緊急度：{task.urgency === 'high' ? '高' : '低'}
              </div>
              {/* 時間表示 */}
              <div className="flex items-center space-x-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{slotData.estimatedTime || 60}分</span>
                {isCompleted && (
                  <Check className="w-3 h-3 ml-1 text-green-600" />
                )}
              </div>
            </div>
          </div>
          
          {/* アクションボタン */}
          {showActions && !isCompleted && (
            <div className="absolute top-1 right-1 flex space-x-1 pointer-events-auto z-10">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-green-200 dark:hover:bg-green-800 text-green-600"
                onClick={handleComplete}
              >
                <Check className="w-2.5 h-2.5" />
              </Button>
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
    urgency: task.urgency,
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
    <div className="absolute left-2 right-2 z-50" style={{ top: '0px' }}>
      <Card className="p-3 border-primary bg-white dark:bg-gray-800 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-2 pointer-events-auto">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-2 py-1 border border-border rounded text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
            required
          />

          {/* 優先度と緊急度 */}
          <div className="grid grid-cols-2 gap-1 mb-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">優先度</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-1 py-1 border border-border rounded text-xs bg-background"
              >
                <option value="high">高</option>
                <option value="low">低</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">緊急度</label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value }))}
                className="w-full px-1 py-1 border border-border rounded text-xs bg-background"
              >
                <option value="high">高</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>

          {/* カテゴリと時間 */}
          <div className="grid grid-cols-2 gap-1">
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

          <div className="flex space-x-1 pointer-events-auto">
            <Button type="submit" size="sm" className="flex-1 h-6 text-xs pointer-events-auto">
              保存
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-6 w-6 p-0 pointer-events-auto"
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
  minute: number
  slotIndex: number
  isBusinessHour: boolean
  isHourStart: boolean
  isHalfHour: boolean
  currentHour: number
  currentMinute: number
  scheduledTasks: any[]
}

function DroppableTimeSlot({ time, hour, minute, slotIndex, isBusinessHour, isHourStart, isHalfHour, currentHour, currentMinute, scheduledTasks }: DroppableTimeSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `timeline-slot-${time}`
  })

  const tasksAtThisTime = scheduledTasks.filter(item => {
    if (!item.slotData.startTime) return false
    const [slotHour, slotMinute] = item.slotData.startTime.split(':').map(Number)
    return slotHour === hour && slotMinute === minute
  })

  const isCurrentSlot = hour === currentHour && minute <= currentMinute && currentMinute < minute + 15

  return (
    <div
      key={time}
      className={`relative flex items-start ${
        isBusinessHour ? 'bg-muted/10' : ''
      } ${isCurrentSlot ? 'bg-blue-50 dark:bg-blue-950/20' : ''} ${
        isHourStart ? 'border-t border-border/40 h-16' : 'border-t border-border/10 h-10'
      }`}
    >
      {/* Time Label - 1時間ごとまたは30分ごとに表示 */}
      <div className="w-16 text-xs text-muted-foreground p-2 font-mono">
        {(isHourStart || isHalfHour) ? time : ''}
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
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const { timeSlots: scheduledSlots, tasks } = useTaskStore()
  const timelineContainerRef = useRef<HTMLDivElement>(null)
  
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
  
  // Create sortable IDs for scheduled tasks
  const sortableIds = scheduledTasks
    .filter(item => item.task) // TypeScript安全性のため
    .map(item => `scheduled-${item.task!.id}-${item.slotId}`)

  // Function to calculate current time position and scroll to it
  const scrollToCurrentTime = () => {
    if (!timelineContainerRef.current) return

    // Calculate current time position (same logic as Current Time Indicator)
    const currentSlotIndex = currentHour * 4 + Math.floor(currentMinute / 15)
    let totalHeight = 0
    
    for (let i = 0; i < currentSlotIndex; i++) {
      const slotMinute = (i % 4) * 15
      totalHeight += slotMinute === 0 ? 64 : 40 // h-16 or h-10
    }
    
    // Add offset within current slot
    const currentSlotMinute = (currentSlotIndex % 4) * 15
    const slotHeight = currentSlotMinute === 0 ? 64 : 40
    const offsetInSlot = ((currentMinute % 15) / 15) * slotHeight
    const currentTimePosition = totalHeight + offsetInSlot

    // Calculate scroll position to center current time
    const containerHeight = timelineContainerRef.current.clientHeight
    const scrollTop = Math.max(0, currentTimePosition - containerHeight / 2)

    // Smooth scroll to position
    timelineContainerRef.current.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    })
  }

  // Scroll to current time on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToCurrentTime()
    }, 100) // Small delay to ensure DOM is ready

    return () => clearTimeout(timer)
  }, [currentHour, currentMinute]) // Dependencies to recalculate if time changes

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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={scrollToCurrentTime}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Clock className="w-4 h-4 mr-1" />
            現在時刻
          </Button>
        </div>
      </div>

      <Separator />

      {/* Timeline Grid */}
      <div ref={timelineContainerRef} className="flex-1 overflow-y-auto" data-timeline="true">
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="relative">
            {/* Current Time Indicator */}
            <div 
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ 
                top: `${(() => {
                  // 15分単位のスロットインデックス
                  const currentSlotIndex = currentHour * 4 + Math.floor(currentMinute / 15)
                  // 各スロットの高さを累積計算
                  let totalHeight = 0
                  for (let i = 0; i < currentSlotIndex; i++) {
                    const slotMinute = (i % 4) * 15
                    totalHeight += slotMinute === 0 ? 64 : 40 // h-16 or h-10
                  }
                  // 現在のスロット内でのオフセット
                  const currentSlotMinute = (currentSlotIndex % 4) * 15
                  const slotHeight = currentSlotMinute === 0 ? 64 : 40
                  const offsetInSlot = ((currentMinute % 15) / 15) * slotHeight
                  return totalHeight + offsetInSlot
                })()}px`
              }}
            >
              {/* 時間軸列内の現在時刻表示 */}
              <div className="absolute left-6 -top-3 w-10 flex flex-col items-center">
                <div className="bg-blue-500/90 text-white text-xs px-1 py-0.5 rounded shadow-sm backdrop-blur-sm">
                  <div className="flex items-center space-x-0.5">
                    <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                    <span className="font-mono text-xs leading-none">
                      {currentHour.toString().padStart(2, '0')}:{currentMinute.toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 精密な時刻ライン（時間軸より右側のみ） */}
              <div className="ml-16 h-px bg-gradient-to-r from-blue-400 to-transparent opacity-80" />
            </div>

            {/* Time Slots */}
            {timeSlots.map((slot) => (
              <DroppableTimeSlot
                key={slot.time}
                time={slot.time}
                hour={slot.hour}
                minute={slot.minute}
                slotIndex={slot.slotIndex}
                isBusinessHour={slot.isBusinessHour}
                isHourStart={slot.isHourStart}
                isHalfHour={slot.isHalfHour}
                currentHour={currentHour}
                currentMinute={currentMinute}
                scheduledTasks={scheduledTasks}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}