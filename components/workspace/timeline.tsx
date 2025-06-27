'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calendar, ChevronLeft, ChevronRight, Clock, Edit2, Trash2, X, Check, RotateCcw, CalendarDays } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTaskStoreWithAuth } from '@/lib/hooks/use-task-store-with-auth'
import { useAuth } from '@/lib/auth/auth-context'
import { useViewState } from '@/lib/hooks/use-view-state'

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
  const { updateTask, removeTimeSlot, completeTask, uncompleteTask } = useTaskStoreWithAuth()
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

  const handleUncomplete = () => {
    uncompleteTask(task.id)
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
            ? 'bg-muted/70 border-muted-foreground/30 opacity-75' 
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
          {showActions && (
            <div className="absolute top-1 right-1 flex space-x-1 pointer-events-auto z-10">
              {!isCompleted ? (
                <>
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
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600"
                  onClick={handleUncomplete}
                  title="未完了に戻す"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </Button>
              )}
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

interface TimelineProps {
  hasInitialScroll?: boolean
  setHasInitialScroll?: (value: boolean) => void
}

export function Timeline({ 
  hasInitialScroll = false, 
  setHasInitialScroll
}: TimelineProps = {}) {
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const { timeSlots: scheduledSlots, tasks } = useTaskStoreWithAuth()
  const { isMobile } = useViewState()
  const timelineContainerRef = useRef<HTMLDivElement>(null)
  const currentTimeIndicatorRef = useRef<HTMLDivElement>(null)
  
  // Get selected date for filtering
  const selectedDateSlots = scheduledSlots.filter(slot => {
    // Ensure slot.date is a Date object (handle deserialization)
    const slotDate = slot.date instanceof Date ? slot.date : new Date(slot.date)
    return slotDate.toDateString() === selectedDate.toDateString()
  })

  // Combine scheduled tasks with their task details
  const scheduledTasks = selectedDateSlots.map(slot => {
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

  // Function to scroll to current time indicator
  const scrollToCurrentTime = useCallback(() => {
    if (!currentTimeIndicatorRef.current || !timelineContainerRef.current) return
    
    // Calculate scroll position based on current time
    const currentSlotIndex = currentHour * 4 + Math.floor(currentMinute / 15)
    let totalHeight = 0
    for (let i = 0; i < currentSlotIndex; i++) {
      const slotMinute = (i % 4) * 15
      totalHeight += slotMinute === 0 ? 64 : 40 // h-16 or h-10
    }
    
    // PC/スマホで異なる表示位置
    const containerHeight = timelineContainerRef.current.clientHeight
    let calculatedScrollPosition
    
    if (isMobile) {
      // スマホ：現在時刻を上から1/5の位置に表示（次のタスクがより見やすくなる）
      calculatedScrollPosition = Math.max(0, totalHeight - containerHeight / 5)
    } else {
      // PC：画面中央に表示
      calculatedScrollPosition = Math.max(0, totalHeight - containerHeight / 2.2)
    }
    
    timelineContainerRef.current.scrollTop = calculatedScrollPosition
  }, [currentHour, currentMinute, isMobile])

  // Scroll to current time on component mount
  useEffect(() => {
    const attemptScroll = (attempt = 1) => {
      if (attempt > 3) {
        // Mark as initial scroll done if this was the first time
        if (!hasInitialScroll && setHasInitialScroll) {
          setHasInitialScroll(true)
        }
        return
      }
      
      if (currentTimeIndicatorRef.current) {
        // 常に画面中央にスクロール
        scrollToCurrentTime()
        
        // 初回の場合のみフラグを更新
        if (!hasInitialScroll && setHasInitialScroll) {
          setHasInitialScroll(true)
        }
      } else {
        // Try again after short delay
        setTimeout(() => attemptScroll(attempt + 1), 500)
      }
    }

    // Start after DOM is ready
    const timer = setTimeout(attemptScroll, 200)
    return () => clearTimeout(timer)
  }, [hasInitialScroll, setHasInitialScroll, scrollToCurrentTime])
  

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const newDate = new Date(selectedDate)
              newDate.setDate(newDate.getDate() - 1)
              setSelectedDate(newDate)
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-medium text-sm md:text-base">
            {selectedDate.toDateString() === new Date().toDateString() 
              ? '本日' 
              : ''}
            {selectedDate.toLocaleDateString('ja-JP', { 
              month: 'long', 
              day: 'numeric', 
              weekday: 'short' 
            })}
          </h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const newDate = new Date(selectedDate)
              newDate.setDate(newDate.getDate() + 1)
              setSelectedDate(newDate)
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {selectedDate.toDateString() !== new Date().toDateString() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="ml-1 md:ml-2 text-xs md:text-sm px-2 md:px-3"
            >
              今日
            </Button>
          )}
        </div>
        <div className="flex space-x-2">
          <Button 
            variant={viewMode === 'timeline' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('timeline')}
            title="タイムラインビュー"
          >
            <Clock className="w-4 h-4 md:mr-1" />
            <span className="hidden md:inline">タイムライン</span>
          </Button>
          <Button 
            variant={viewMode === 'calendar' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('calendar')}
            title="カレンダービュー"
          >
            <CalendarDays className="w-4 h-4 md:mr-1" />
            <span className="hidden md:inline">カレンダー</span>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Timeline or Calendar View */}
      {viewMode === 'timeline' ? (
        <div 
          ref={timelineContainerRef} 
          className="flex-1 overflow-y-auto" 
          data-timeline="true"
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="relative">
            {/* Current Time Indicator */}
            <div 
              ref={currentTimeIndicatorRef}
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
      ) : (
        <CalendarView 
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          scheduledSlots={scheduledSlots}
          tasks={tasks}
        />
      )}
    </div>
  )
}

// Calendar View Component
interface CalendarViewProps {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  scheduledSlots: any[]
  tasks: any[]
}

function CalendarView({ selectedDate, setSelectedDate, scheduledSlots, tasks }: CalendarViewProps) {
  const { completeTask, uncompleteTask, removeTimeSlot } = useTaskStoreWithAuth()
  
  // Get calendar data for the current month
  const currentMonth = selectedDate.getMonth()
  const currentYear = selectedDate.getFullYear()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const startDate = new Date(firstDayOfMonth)
  const startDay = startDate.getDay()
  startDate.setDate(startDate.getDate() - startDay)
  
  const days = []
  const currentDate = new Date(startDate)
  
  while (currentDate <= lastDayOfMonth || currentDate.getDay() !== 0) {
    days.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  // Group tasks by date
  const tasksByDate: { [key: string]: any[] } = {}
  scheduledSlots.forEach(slot => {
    const slotDate = slot.date instanceof Date ? slot.date : new Date(slot.date)
    const dateKey = slotDate.toDateString()
    const task = tasks.find(t => t.id === slot.taskId)
    if (task) {
      if (!tasksByDate[dateKey]) {
        tasksByDate[dateKey] = []
      }
      tasksByDate[dateKey].push({ task, slot })
    }
  })
  
  // Get tasks for selected date
  const selectedDateKey = selectedDate.toDateString()
  const selectedDateTasks = tasksByDate[selectedDateKey] || []
  
  return (
    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-4">
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5 md:gap-1">
        {/* Weekday headers */}
        {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
          <div 
            key={day} 
            className={`text-center font-medium md:font-semibold text-xs md:text-sm p-1 md:p-2 ${
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : ''
            }`}
          >
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((day, index) => {
          const isCurrentMonth = day.getMonth() === currentMonth
          const isToday = day.toDateString() === new Date().toDateString()
          const isSelected = day.toDateString() === selectedDate.toDateString()
          const dateKey = day.toDateString()
          const dayTasks = tasksByDate[dateKey] || []
          const dayOfWeek = day.getDay()
          
          return (
            <Card
              key={index}
              className={`min-h-[60px] md:min-h-[100px] p-1 md:p-2 cursor-pointer transition-colors ${
                !isCurrentMonth ? 'opacity-50' : ''
              } ${
                isToday ? 'ring-1 md:ring-2 ring-blue-500' : ''
              } ${
                isSelected ? 'bg-blue-50 dark:bg-blue-950/30' : ''
              } hover:bg-gray-50 dark:hover:bg-gray-800`}
              onClick={() => setSelectedDate(new Date(day))}
            >
              <div className="flex flex-col h-full">
                <div className={`text-xs md:text-sm font-medium mb-0.5 md:mb-1 ${
                  dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : ''
                }`}>
                  {day.getDate()}
                </div>
                <div className="flex-1 space-y-1 overflow-y-auto">
                  {/* Desktop view - show task names */}
                  <div className="hidden md:block space-y-1">
                    {dayTasks.slice(0, 3).map(({ task, slot }, taskIndex) => (
                      <div
                        key={taskIndex}
                        className={`text-xs p-1 rounded truncate ${
                          task.status === 'completed'
                            ? 'bg-gray-100 dark:bg-gray-700 line-through opacity-60'
                            : task.priority === 'high' && task.urgency === 'high'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : task.priority === 'high' && task.urgency === 'low'
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                            : task.priority === 'low' && task.urgency === 'high'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}
                        title={task.title}
                      >
                        <span className="flex items-center justify-between">
                          <span className="truncate">{task.title}</span>
                          {task.status === 'completed' && (
                            <Check className="w-3 h-3 flex-shrink-0 ml-1" />
                          )}
                        </span>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                  
                  {/* Mobile view - show only colored dots */}
                  <div className="md:hidden flex flex-wrap gap-0.5">
                    {dayTasks.map(({ task, slot }, taskIndex) => (
                      <div
                        key={taskIndex}
                        className={`w-2 h-2 rounded-full ${
                          task.status === 'completed'
                            ? 'bg-gray-400 opacity-60'
                            : task.priority === 'high' && task.urgency === 'high'
                            ? 'bg-red-500'
                            : task.priority === 'high' && task.urgency === 'low'
                            ? 'bg-orange-500'
                            : task.priority === 'low' && task.urgency === 'high'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        title={task.title}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      
      {/* Selected Date Tasks */}
      <div className="mt-4">
        <div className="mb-3">
          <h3 className="text-sm md:text-base font-semibold text-foreground">
            {selectedDate.toLocaleDateString('ja-JP', { 
              month: 'long', 
              day: 'numeric', 
              weekday: 'long' 
            })}のタスク
          </h3>
          <Separator className="mt-2" />
        </div>
        
        {selectedDateTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">この日にスケジュールされたタスクはありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDateTasks
              .sort((a, b) => {
                // Sort by start time
                const timeA = a.slot.startTime || '00:00'
                const timeB = b.slot.startTime || '00:00'
                return timeA.localeCompare(timeB)
              })
              .map(({ task, slot }, index) => (
                <SelectedDateTaskCard 
                  key={`${task.id}-${slot.id}`}
                  task={task}
                  slot={slot}
                  onComplete={() => completeTask(task.id)}
                  onUncomplete={() => uncompleteTask(task.id)}
                  onRemove={() => removeTimeSlot(slot.id)}
                />
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

// Selected Date Task Card Component
interface SelectedDateTaskCardProps {
  task: any
  slot: any
  onComplete: () => void
  onUncomplete: () => void
  onRemove: () => void
}

function SelectedDateTaskCard({ task, slot, onComplete, onUncomplete, onRemove }: SelectedDateTaskCardProps) {
  const [showActions, setShowActions] = useState(false)
  const isCompleted = task.status === 'completed'
  
  return (
    <Card 
      className={`p-3 md:p-4 transition-colors hover:bg-muted/50 ${
        isCompleted ? 'opacity-60 bg-muted/30' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Task Title and Time */}
          <div className="flex items-center space-x-2 mb-2">
            <h4 className={`font-medium text-sm md:text-base truncate ${
              isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
            }`}>
              {task.title}
            </h4>
            {isCompleted && (
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            )}
          </div>
          
          {/* Time and Duration */}
          <div className="flex items-center space-x-4 mb-2 text-xs md:text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{slot.startTime || '時間未設定'}</span>
              {slot.endTime && (
                <span>- {slot.endTime}</span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <span>予想時間: {task.estimatedTime || 60}分</span>
            </div>
          </div>
          
          {/* Priority and Urgency Badges */}
          <div className="flex items-center space-x-2">
            <div className={`px-2 py-1 rounded text-xs ${
              task.priority === 'high' 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            }`}>
              優先度：{task.priority === 'high' ? '高' : '低'}
            </div>
            <div className={`px-2 py-1 rounded text-xs ${
              task.urgency === 'high' 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            }`}>
              緊急度：{task.urgency === 'high' ? '高' : '低'}
            </div>
            <div className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              {task.category === 'work' ? '仕事' : task.category === 'personal' ? '個人' : 'カスタム'}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        {showActions && (
          <div className="flex space-x-1 ml-2">
            {!isCompleted ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-green-200 dark:hover:bg-green-800 text-green-600"
                  onClick={onComplete}
                  title="完了"
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-red-200 dark:hover:bg-red-800 text-red-600"
                  onClick={onRemove}
                  title="削除"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600"
                onClick={onUncomplete}
                title="未完了に戻す"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}