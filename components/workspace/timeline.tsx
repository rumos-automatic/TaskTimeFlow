'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calendar, ChevronLeft, ChevronRight, Clock, Edit2, Trash2, X, Check, RotateCcw, CalendarDays, Plus, Copy, FileText, ListTodo, Timer } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatSecondsToHM } from '@/lib/utils/time-helpers'
import { useDroppable } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTaskStoreWithAuth } from '@/lib/hooks/use-task-store-with-auth'
import { useSupabaseTaskStore } from '@/lib/store/use-supabase-task-store'
import { useAuth } from '@/lib/auth/auth-context'
import { useViewState } from '@/lib/hooks/use-view-state'
import { useCategoryStoreWithAuth } from '@/lib/hooks/use-category-store-with-auth'
import { Task, Priority, Urgency, TaskCategory } from '@/lib/types'
import { TimelineAddForm, BaseTaskForm, CalendarAddForm, TaskFormData } from '@/components/ui/task-form'
import { TaskDetailModal } from './task-detail-modal'
import { getDueDateInfo } from '@/lib/utils/date-helpers'
import { TaskService } from '@/lib/supabase/task-service'

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
  const [showDetail, setShowDetail] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStartY, setResizeStartY] = useState(0)
  const [resizeStartHeight, setResizeStartHeight] = useState(0)
  const [tempEstimatedTime, setTempEstimatedTime] = useState(slotData.estimatedTime || 60)
  const [tempStartTime, setTempStartTime] = useState(slotData.startTime)
  const [resizePosition, setResizePosition] = useState<'top' | 'bottom' | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  
  const { isMobile } = useViewState()
  
  const { updateTask, removeTimeSlot, completeTask, uncompleteTask, addTask, moveTaskToTimeline } = useTaskStoreWithAuth()
  const { user } = useAuth()
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
    transition: isResizing ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: isResizing ? 'none' : 'auto'
  }


  // リサイズハンドラー
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, position: 'top' | 'bottom') => {
    e.preventDefault()
    e.stopPropagation()
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setResizeStartY(clientY)
    setResizeStartHeight(cardRef.current?.offsetHeight || 0)
    setIsResizing(true)
    setResizePosition(position)
    setTempEstimatedTime(slotData.estimatedTime || 60)
    setTempStartTime(slotData.startTime)
  }

  const handleResizeMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing || !cardRef.current || !resizePosition) return
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const deltaY = clientY - resizeStartY
    
    // 15分単位のスナップ（全スロットが統一）
    const pixelsPerSlot = TIME_SLOT_HEIGHT // 統一されたスロットの高さ
    const slotsChanged = Math.round(deltaY / pixelsPerSlot)
    const minutesChanged = slotsChanged * 15
    
    if (resizePosition === 'top') {
      // 上部リサイズ：開始時間を変更
      // deltaYが負 = 上に移動 = 開始時間が早くなる
      const [startHour, startMinute] = slotData.startTime.split(':').map(Number)
      const startTotalMinutes = startHour * 60 + startMinute
      const newStartTotalMinutes = startTotalMinutes + minutesChanged
      
      // 0:00-23:45の範囲に制限
      const clampedStartMinutes = Math.max(0, Math.min(23 * 60 + 45, newStartTotalMinutes))
      const newStartHour = Math.floor(clampedStartMinutes / 60)
      const newStartMinute = clampedStartMinutes % 60
      const newStartTime = `${newStartHour.toString().padStart(2, '0')}:${newStartMinute.toString().padStart(2, '0')}`
      
      // 開始時間の変更に伴い、推定時間も調整（最小15分を保つ）
      const originalEndMinutes = startTotalMinutes + (slotData.estimatedTime || 60)
      const newEstimatedTime = Math.max(15, originalEndMinutes - clampedStartMinutes)
      
      setTempStartTime(newStartTime)
      setTempEstimatedTime(newEstimatedTime)
    } else {
      // 下部リサイズ：終了時間を変更（推定時間を変更）
      const newEstimatedTime = Math.max(15, Math.min(1440, (slotData.estimatedTime || 60) + minutesChanged))
      setTempEstimatedTime(newEstimatedTime)
    }
  }, [isResizing, resizeStartY, slotData.estimatedTime, slotData.startTime, resizePosition])

  const handleResizeEnd = useCallback(async () => {
    if (!isResizing) return
    
    setIsResizing(false)
    setResizePosition(null)
    
    
    // 時間が変更された場合のみ更新
    const timeChanged = tempEstimatedTime !== (slotData.estimatedTime || 60)
    const startTimeChanged = tempStartTime !== slotData.startTime
    
    if (timeChanged || startTimeChanged) {
      const slotDate = slotData.date instanceof Date ? slotData.date : new Date(slotData.date)
      
      // タスクを更新
      await updateTask(task.id, {
        estimatedTime: tempEstimatedTime,
        scheduledDate: slotDate,
        scheduledTime: tempStartTime
      })
      
      // タイムスロットを再作成
      await removeTimeSlot(slotId)
      if (user) {
        await moveTaskToTimeline(task.id, slotDate, tempStartTime, user.id)
      }
    }
  }, [isResizing, tempEstimatedTime, tempStartTime, slotData, task.id, updateTask, removeTimeSlot, moveTaskToTimeline, user, slotId])

  // リサイズ中のマウス/タッチイベントをリッスン
  useEffect(() => {
    if (isResizing) {
      const handleMove = (e: MouseEvent | TouchEvent) => handleResizeMove(e)
      const handleEnd = () => handleResizeEnd()
      
      document.addEventListener('mousemove', handleMove)
      document.addEventListener('touchmove', handleMove)
      document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchend', handleEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleMove)
        document.removeEventListener('touchmove', handleMove)
        document.removeEventListener('mouseup', handleEnd)
        document.removeEventListener('touchend', handleEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])
  

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

  const handleCopy = async () => {
    if (!user) return
    
    await addTask({
      title: task.title,
      priority: task.priority,
      urgency: task.urgency,
      category: task.category,
      estimatedTime: task.estimatedTime,
      status: 'todo'
    }, user.id)
    
    setShowActions(false)
  }

  if (isEditing) {
    return (
      <EditScheduledTaskCard 
        task={task}
        slot={slotData}
        onSave={async (updatedTask) => {
          // デバッグ用ログ
          console.log('📱 Timeline onSave:', {
            taskId: task.id,
            originalEstimatedTime: task.estimatedTime,
            updatedEstimatedTime: updatedTask.estimatedTime,
            timeChanged: updatedTask.estimatedTime !== task.estimatedTime
          })
          
          // estimatedTimeが変更された場合はタイムスロットを再作成
          const timeChanged = updatedTask.estimatedTime !== task.estimatedTime
          
          if (timeChanged) {
            // スロットの日付を取得
            const slotDate = slotData.date instanceof Date ? slotData.date : new Date(slotData.date)
            
            // まずタスク情報を更新（scheduledDateとscheduledTimeも含む）
            await updateTask(task.id, {
              title: updatedTask.title,
              priority: updatedTask.priority,
              urgency: updatedTask.urgency,
              category: updatedTask.category,
              estimatedTime: updatedTask.estimatedTime,
              scheduledDate: slotDate,
              scheduledTime: slotData.startTime
            })
            
            // 現在のスロットを削除
            await removeTimeSlot(slotId)
            
            // 直接新しいスロットを作成（moveTaskToTimelineを使用）
            if (user) {
              await moveTaskToTimeline(task.id, slotDate, slotData.startTime, user.id)
            }
          } else {
            // estimatedTimeが変更されていない場合は通常の更新
            await updateTask(task.id, {
              title: updatedTask.title,
              priority: updatedTask.priority,
              urgency: updatedTask.urgency,
              category: updatedTask.category,
              estimatedTime: updatedTask.estimatedTime
            })
          }
          
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
        ref={cardRef}
        {...(!isCompleted && !isResizing ? { ...listeners, ...attributes } : {})}
        className={`absolute left-2 right-2 p-2 transition-colors group ${!isCompleted && !isResizing ? 'cursor-move' : ''} ${
          isDragging ? 'z-50 shadow-2xl scale-105' : 'z-20'
        } ${
          isCompleted 
            ? 'bg-muted/70 border-muted-foreground/30 opacity-75' 
            : 'bg-blue-100 border-blue-300 dark:bg-blue-950/30 hover:bg-blue-200 dark:hover:bg-blue-900/40'
        } ${
          isResizing ? 'ring-2 ring-primary ring-offset-2' : ''
        }`}
        style={{ 
          height: `${(() => {
            const minutes = isResizing ? tempEstimatedTime : (slotData.estimatedTime || 60)
            const slots = Math.ceil(minutes / 15)
            // 全スロットの高さが統一されたため、シンプルな計算に
            const totalHeight = slots * TIME_SLOT_HEIGHT
            
            // パディング分を考慮して少し減らす
            return totalHeight - 4
          })()}px`,
          top: `${(() => {
            if (!isResizing || resizePosition !== 'top') return 0
            
            // 元の開始時間と新しい開始時間の差を計算
            const [origHour, origMinute] = slotData.startTime.split(':').map(Number)
            const [newHour, newMinute] = tempStartTime.split(':').map(Number)
            const origTotalMinutes = origHour * 60 + origMinute
            const newTotalMinutes = newHour * 60 + newMinute
            const minutesDiff = newTotalMinutes - origTotalMinutes
            const slotsDiff = Math.floor(minutesDiff / 15)
            
            // スロット差分から位置の変更を計算
            let topOffset = 0
            const origSlotIndex = origHour * 4 + Math.floor(origMinute / 15)
            
            if (slotsDiff < 0) {
              // 上に移動（開始時間が早くなった）
              for (let i = slotsDiff; i < 0; i++) {
                const slotIndex = origSlotIndex + i
                const minute = (slotIndex % 4) * 15
                topOffset -= (minute === 0 ? 64 : 40)
              }
            } else if (slotsDiff > 0) {
              // 下に移動（開始時間が遅くなった）
              for (let i = 0; i < slotsDiff; i++) {
                const slotIndex = origSlotIndex + i
                const minute = (slotIndex % 4) * 15
                topOffset += (minute === 0 ? 64 : 40)
              }
            }
            
            return topOffset
          })()}px`
        }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="relative h-full">
          {/* コンテンツエリア */}
          <div className="relative h-full">
            <div 
              className={`text-xs font-medium mb-1 cursor-pointer hover:text-primary transition-colors ${isCompleted ? 'line-through text-muted-foreground' : ''}`}
              onClick={() => setShowDetail(true)}
            >
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
                <span>
                  {isResizing && resizePosition === 'top' && (
                    <span className="text-primary font-medium">{tempStartTime} - </span>
                  )}
                  {isResizing ? tempEstimatedTime : (slotData.estimatedTime || 60)}分
                </span>
                {isCompleted && (
                  <Check className="w-3 h-3 ml-1 text-green-600" />
                )}
              </div>
              {/* メモアイコン */}
              {task.notes && (
                <div className="flex items-center space-x-1 text-amber-600" title="メモあり">
                  <FileText className="w-3 h-3" />
                  <span className="text-xs">メモ</span>
                </div>
              )}
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
                    className="h-5 w-5 p-0 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-600"
                    onClick={handleCopy}
                    title="タスクをコピー"
                  >
                    <Copy className="w-2.5 h-2.5" />
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
          
          {/* リサイズハンドル（PCのみ） */}
          {!isCompleted && !isMobile && (
            <>
              {/* 上部リサイズハンドル */}
              <div
                className={`absolute left-0 right-0 top-0 cursor-ns-resize transition-colors ${
                  isResizing ? 'bg-primary/30 h-4' : isMobile ? 'h-4 bg-primary/20' : 'h-2 hover:bg-primary/20 hover:h-3'
                }`}
                onMouseDown={(e) => handleResizeStart(e, 'top')}
                onTouchStart={(e) => handleResizeStart(e, 'top')}
              />
              {/* 下部リサイズハンドル */}
              <div
                className={`absolute left-0 right-0 bottom-0 cursor-ns-resize transition-colors ${
                  isResizing ? 'bg-primary/30 h-4' : isMobile ? 'h-4 bg-primary/20' : 'h-2 hover:bg-primary/20 hover:h-3'
                }`}
                onMouseDown={(e) => handleResizeStart(e, 'bottom')}
                onTouchStart={(e) => handleResizeStart(e, 'bottom')}
              />
            </>
          )}
        </div>
      </Card>
      
      <TaskDetailModal
        task={task}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onSave={(taskId, updates) => {
          updateTask(taskId, updates)
          setShowDetail(false)
        }}
      />
    </div>
  )
}

interface EditScheduledTaskCardProps {
  task: any
  slot: any
  onSave: (task: any) => void | Promise<void>
  onCancel: () => void
}

function EditScheduledTaskCard({ task, slot, onSave, onCancel }: EditScheduledTaskCardProps) {
  const { allCategories } = useCategoryStoreWithAuth()
  const [localFormData, setLocalFormData] = useState({
    title: task.title,
    priority: task.priority,
    urgency: task.urgency,
    category: task.category,
    estimatedTime: task.estimatedTime
  })
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(localFormData)
  }

  return (
    <div className="absolute left-2 right-2 z-50" style={{ top: '0px' }}>
      <Card className="border-primary bg-white dark:bg-gray-800 shadow-lg p-3">
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            value={localFormData.title}
            onChange={(e) => setLocalFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-2 py-1 border border-border rounded text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
            required
          />
          
          <div className="grid grid-cols-2 gap-2">
            <select
              value={localFormData.priority}
              onChange={(e) => setLocalFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
              className="px-2 py-1 border border-border rounded text-xs bg-background"
            >
              <option value="high">優先度：高</option>
              <option value="low">優先度：低</option>
            </select>
            
            <select
              value={localFormData.urgency}
              onChange={(e) => setLocalFormData(prev => ({ ...prev, urgency: e.target.value as Urgency }))}
              className="px-2 py-1 border border-border rounded text-xs bg-background"
            >
              <option value="high">緊急度：高</option>
              <option value="low">緊急度：低</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <select
              value={localFormData.category}
              onChange={(e) => setLocalFormData(prev => ({ ...prev, category: e.target.value }))}
              className="px-2 py-1 border border-border rounded text-xs bg-background"
            >
              {allCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon || ''} {category.name}
                </option>
              ))}
            </select>
            
            <select
              value={String(localFormData.estimatedTime)}
              onChange={(e) => setLocalFormData(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) }))}
              className="px-2 py-1 border border-border rounded text-xs bg-background"
            >
              <option value="15">15分</option>
              <option value="30">30分</option>
              <option value="45">45分</option>
              <option value="60">1時間</option>
              <option value="90">1時間30分</option>
              <option value="120">2時間</option>
              <option value="180">3時間</option>
              <option value="240">4時間</option>
              <option value="300">5時間</option>
              <option value="360">6時間</option>
              <option value="420">7時間</option>
              <option value="480">8時間</option>
            </select>
          </div>
          
          <div className="flex space-x-2 pt-1">
            <Button type="submit" size="sm" className="flex-1 h-7 text-xs">
              保存
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={onCancel}
              className="h-7 text-xs"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

interface AddTimeSlotTaskFormProps {
  time: string
  hour: number
  minute: number
  onSave: (taskData: any) => void
  onCancel: () => void
  scheduledTasks?: any[]
}

// Function to calculate available duration until next task
function calculateAvailableDuration(currentTime: string, scheduledTasks: any[]): number {
  const [currentHour, currentMinute] = currentTime.split(':').map(Number)
  const currentTotalMinutes = currentHour * 60 + currentMinute
  
  // Find all tasks scheduled after the current time
  const laterTasks = scheduledTasks
    .filter(item => {
      const [taskHour, taskMinute] = item.slotData.startTime.split(':').map(Number)
      const taskTotalMinutes = taskHour * 60 + taskMinute
      return taskTotalMinutes > currentTotalMinutes
    })
    .sort((a, b) => {
      const [aHour, aMinute] = a.slotData.startTime.split(':').map(Number)
      const [bHour, bMinute] = b.slotData.startTime.split(':').map(Number)
      return (aHour * 60 + aMinute) - (bHour * 60 + bMinute)
    })
  
  if (laterTasks.length > 0) {
    // Calculate duration until the next task
    const nextTask = laterTasks[0]
    const [nextHour, nextMinute] = nextTask.slotData.startTime.split(':').map(Number)
    const nextTotalMinutes = nextHour * 60 + nextMinute
    const availableMinutes = nextTotalMinutes - currentTotalMinutes
    
    // Return the available duration, but cap it at 120 minutes (2 hours)
    return Math.min(availableMinutes, 120)
  }
  
  // If no tasks after this time, default to 30 minutes
  return 30
}

function AddTimeSlotTaskForm({ time, hour, minute, onSave, onCancel, scheduledTasks = [] }: AddTimeSlotTaskFormProps) {
  const { allCategories } = useCategoryStoreWithAuth()
  
  // Calculate default duration based on available time
  const calculatedDuration = calculateAvailableDuration(time, scheduledTasks)
  
  // Find the closest available time option
  const timeOptions = [15, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480]
  const defaultDuration = timeOptions.reduce((prev, curr) => {
    return Math.abs(curr - calculatedDuration) < Math.abs(prev - calculatedDuration) ? curr : prev
  })

  // Memoize defaultValues to prevent re-renders from resetting the form
  const defaultValues = useMemo(() => ({
    category: 'work',
    estimatedTime: defaultDuration
  }), [defaultDuration])

  const handleSubmit = (formData: TaskFormData) => {
    const finalData = {
      title: formData.title,
      priority: formData.priority,
      urgency: formData.urgency,
      category: formData.category,
      estimatedTime: formData.estimatedTime === '' ? defaultDuration : formData.estimatedTime,
      scheduledTime: time
    }
    onSave(finalData)
  }

  return (
    <div className="absolute left-0 right-0 top-0 z-50 bg-white dark:bg-gray-800 border border-border rounded-md shadow-lg">
      <TimelineAddForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        categories={allCategories}
        submitLabel="作成"
        header={
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">{time} のタスク</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        }
      />
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
  activeSlot: string | null
  setActiveSlot: (slot: string | null) => void
  activeFormSlot: string | null
  setActiveFormSlot: (slot: string | null) => void
  selectedDate: Date
}

function DroppableTimeSlot({ time, hour, minute, slotIndex, isBusinessHour, isHourStart, isHalfHour, currentHour, currentMinute, scheduledTasks, activeSlot, setActiveSlot, activeFormSlot, setActiveFormSlot, selectedDate }: DroppableTimeSlotProps) {
  const { user } = useAuth()
  const { addTask, moveTaskToTimeline, tasks } = useTaskStoreWithAuth()
  
  // このスロットがアクティブかどうかを判定
  const isActive = activeSlot === time
  // このスロットのフォームが表示されているかどうかを判定
  const showAddForm = activeFormSlot === time
  
  const { setNodeRef, isOver } = useDroppable({
    id: `timeline-slot-${time}`
  })

  const tasksAtThisTime = scheduledTasks.filter(item => {
    if (!item.slotData.startTime) return false
    const [slotHour, slotMinute] = item.slotData.startTime.split(':').map(Number)
    return slotHour === hour && slotMinute === minute
  })

  const isCurrentSlot = hour === currentHour && minute <= currentMinute && currentMinute < minute + 15
  const hasNoTasks = tasksAtThisTime.length === 0

  const handleAddTask = async (taskData: any) => {
    if (!user) return
    
    try {
      console.log('🚀 Creating task for timeline slot:', { time, taskData })
      
      // タスクを作成（タスクプールに追加）
      await addTask({
        title: taskData.title,
        priority: taskData.priority,
        urgency: taskData.urgency,
        category: taskData.category,
        estimatedTime: taskData.estimatedTime,
        status: 'todo'
      }, user.id)
      
      console.log('✅ Task created, waiting for updates...')
      
      // 短い間隔で数回チェックして最新のタスクを見つける
      let attempts = 0
      const maxAttempts = 15
      const checkInterval = 300
      
      const findAndScheduleTask = () => {
        setTimeout(async () => {
          attempts++
          console.log(`🔍 Attempt ${attempts}/${maxAttempts} to find task:`, taskData.title)
          
          try {
            // ストアから最新のタスクを動的に取得
            const { tasks: currentTasks } = useSupabaseTaskStore.getState()
            console.log('📋 Current tasks count from store:', currentTasks.length)
            
            // タイトルとカテゴリでマッチング（より確実に特定）
            const latestTask = currentTasks
              .filter(task => 
                task.title === taskData.title && 
                task.category === taskData.category &&
                task.status === 'todo' &&
                !task.scheduledDate &&
                !task.scheduledTime
              )
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] // 最新のものを取得
            
            console.log('🎯 Found matching task:', latestTask?.title, latestTask?.id)
            
            if (latestTask) {
              console.log('📅 Moving task to timeline...', { 
                taskId: latestTask.id, 
                time, 
                date: selectedDate.toDateString() 
              })
              
              await moveTaskToTimeline(
                latestTask.id,
                selectedDate, // 選択された日付
                time, // 選択された時間
                user.id // userIdを追加
              )
              
              console.log('✅ Task scheduled successfully!')
              setActiveFormSlot(null) // 成功したらアクティブフォームスロットをクリア
              setActiveSlot(null) // アクティブスロットもクリア
            } else if (attempts < maxAttempts) {
              console.log('⏳ Task not found yet, retrying...')
              findAndScheduleTask() // 再試行
            } else {
              console.warn('⚠️ Failed to find task after', maxAttempts, 'attempts')
              setActiveFormSlot(null) // 失敗してもアクティブフォームスロットをクリア
              setActiveSlot(null) // アクティブスロットもクリア
            }
          } catch (error) {
            console.error('❌ Failed to schedule task:', error)
            setActiveFormSlot(null) // エラー時もアクティブフォームスロットをクリア
            setActiveSlot(null) // エラー時もアクティブスロットをクリア
          }
        }, checkInterval)
      }
      
      findAndScheduleTask()
      // フォームクリアは成功/失敗/エラー時の各ケースで実行されるため、ここでは削除
      
    } catch (error) {
      console.error('❌ Failed to create task:', error)
    }
  }

  return (
    <div
      key={time}
      className={`relative flex items-start ${
        isBusinessHour ? 'bg-muted/10' : ''
      } ${isCurrentSlot ? 'bg-blue-50 dark:bg-blue-950/20' : ''} h-16`}
    >
      {/* Time Label - 1時間ごとまたは30分ごとに表示 */}
      <div className="w-16 text-xs text-muted-foreground px-2 pt-px font-mono flex items-start leading-none">
        {(isHourStart || isHalfHour) ? time : ''}
      </div>

      {/* Drop Zone */}
      <div 
        ref={setNodeRef}
        className={`flex-1 min-h-full border-l border-border/20 p-2 relative transition-colors ${
          isOver ? 'bg-blue-100 dark:bg-blue-950/30 border-blue-300' : ''
        } ${
          isHourStart ? 'border-t-2 border-border/60' : 
          isHalfHour ? 'border-t border-border/30' : 
          'border-t border-border/20'
        }`}
        onMouseEnter={() => setActiveSlot(time)}
        onMouseLeave={() => setActiveSlot(null)}
        onTouchStart={() => setActiveSlot(time)}
        onTouchEnd={() => setActiveSlot(null)}
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
        {hasNoTasks && !showAddForm && (
          <div className={`absolute inset-0 border-2 border-dashed transition-all ${
            isOver 
              ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/20' 
              : 'border-transparent hover:border-border/40'
          }`}>
            {/* Hover text - only show when not active and not being dragged over */}
            {!isActive && !isOver && (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground opacity-0 hover:opacity-60 transition-all">
                タスクをドロップ
              </div>
            )}
            
            {/* Drag over text */}
            {isOver && (
              <div className="flex items-center justify-center h-full text-xs text-blue-600 opacity-100 transition-all">
                ここにドロップ
              </div>
            )}
            
            {/* Add Task Button - only show when active and not being dragged over */}
            {isActive && !isOver && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🔘 Plus button clicked for slot:', time)
                    setActiveFormSlot(time)
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('👆 Plus button touched for slot:', time)
                    setActiveFormSlot(time)
                  }}
                  className="h-6 w-6 p-0 rounded-full bg-primary/10 hover:bg-primary/20 text-primary opacity-70 hover:opacity-100 transition-all"
                  title="タスクを追加"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Add Task Form */}
        {showAddForm && (
          <AddTimeSlotTaskForm
            time={time}
            hour={hour}
            minute={minute}
            scheduledTasks={scheduledTasks}
            onSave={handleAddTask}
            onCancel={() => {
              setActiveFormSlot(null)
              setActiveSlot(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

// タイムスロットの高さ定数
const TIME_SLOT_HEIGHT = 64 // px

interface TimelineProps {
  hasInitialScroll?: boolean
  setHasInitialScroll?: (value: boolean) => void
  selectedDate?: Date
  setSelectedDate?: (date: Date) => void
  mobileContainerRef?: React.RefObject<HTMLDivElement | null>
}

export function Timeline({ 
  hasInitialScroll = false, 
  setHasInitialScroll,
  selectedDate: propSelectedDate,
  setSelectedDate: propSetSelectedDate,
  mobileContainerRef
}: TimelineProps = {}) {
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline')
  
  // Props から selectedDate を受け取る場合はそれを使用、そうでなければ internal state を使用
  const [internalSelectedDate, setInternalSelectedDate] = useState(new Date())
  const selectedDate = propSelectedDate || internalSelectedDate
  const setSelectedDate = propSetSelectedDate || setInternalSelectedDate
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const { timeSlots: scheduledSlots, tasks } = useTaskStoreWithAuth()
  const { isMobile } = useViewState()
  const timelineContainerRef = useRef<HTMLDivElement>(null)
  const currentTimeIndicatorRef = useRef<HTMLDivElement>(null)
  
  // アクティブなスロット管理（プラスボタンの重複防止）
  const [activeSlot, setActiveSlot] = useState<string | null>(null)
  // アクティブなフォームスロット管理（フォーム重複防止）
  const [activeFormSlot, setActiveFormSlot] = useState<string | null>(null)
  
  // 🔍 タイムライン表示のデバッグログ
  console.log('🔍 Timeline Debug Info:')
  console.log('📅 Selected Date:', selectedDate.toDateString())
  console.log('📊 Total scheduledSlots from store:', scheduledSlots.length)
  console.log('📋 Total tasks from store:', tasks.length)
  console.log('📃 scheduledSlots data:', scheduledSlots)
  
  // Get selected date for filtering
  const selectedDateSlots = scheduledSlots.filter(slot => {
    // Ensure slot.date is a Date object (handle deserialization)
    const slotDate = slot.date instanceof Date ? slot.date : new Date(slot.date)
    const matches = slotDate.toDateString() === selectedDate.toDateString()
    if (matches) {
      console.log('✅ Found slot for selected date:', { slot, slotDate: slotDate.toDateString() })
    }
    return matches
  })
  
  console.log('🎯 Filtered slots for selected date:', selectedDateSlots.length)

  // Combine scheduled tasks with their task details
  const scheduledTasks = selectedDateSlots.map(slot => {
    const task = tasks.find(t => t.id === slot.taskId)
    console.log('🔗 Mapping slot to task:', { slotId: slot.id, taskId: slot.taskId, foundTask: !!task })
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
  }).filter(item => {
    const hasTask = !!item.task?.title
    if (!hasTask) {
      console.log('❌ Filtered out item without task:', item)
    }
    return hasTask
  })
  
  console.log('📝 Final scheduledTasks for display:', scheduledTasks.length)
  console.log('📝 scheduledTasks content:', scheduledTasks)
  
  // Get due tasks for selected date
  const dueTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === 'completed') return false
    const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)
    return dueDate.toDateString() === selectedDate.toDateString()
  }).filter(task => {
    // Exclude already scheduled tasks
    return !scheduledTasks.some(({ task: scheduledTask }) => scheduledTask?.id === task.id)
  })
  
  console.log('🎯 Due tasks for selected date:', dueTasks.length)
  
  // Create sortable IDs for scheduled tasks and due tasks
  const scheduledSortableIds = scheduledTasks
    .filter(item => item.task) // TypeScript安全性のため
    .map(item => `scheduled-${item.task!.id}-${item.slotId}`)
    
  const dueSortableIds = dueTasks.map(task => `due-task-${task.id}`)
  
  const sortableIds = [...dueSortableIds, ...scheduledSortableIds]

  // Function to scroll to current time indicator
  const scrollToCurrentTime = useCallback(() => {
    // モバイルの場合は親コンテナを使用、それ以外は内部コンテナを使用
    const scrollContainer = isMobile && mobileContainerRef?.current 
      ? mobileContainerRef.current 
      : timelineContainerRef.current
      
    if (!currentTimeIndicatorRef.current || !scrollContainer) return
    
    // Calculate scroll position based on current time
    const currentSlotIndex = currentHour * 4 + Math.floor(currentMinute / 15)
    // 全スロットが統一されたため、シンプルな計算に
    const totalHeight = currentSlotIndex * TIME_SLOT_HEIGHT
    
    // Add offset for Due Tasks Section if present
    // Due Tasks Sectionのコンテナ要素を探す
    const dueSectionElement = scrollContainer.querySelector('.bg-orange-50') as HTMLElement
    let dueSectionOffset = 0
    if (dueSectionElement) {
      // Due Tasks Sectionの高さ + space-y-4のマージン（16px）
      dueSectionOffset = dueSectionElement.offsetHeight + 16
    }
    
    // 実際のタイムラインインジケーターの位置
    const actualIndicatorPosition = totalHeight + dueSectionOffset
    
    // PC/スマホで異なる表示位置
    const containerHeight = scrollContainer.clientHeight
    let calculatedScrollPosition
    
    if (isMobile) {
      // スマホ：現在時刻を上から1/5の位置に表示
      const offsetFromTop = containerHeight / 5  // 画面の1/5の位置
      calculatedScrollPosition = Math.max(0, actualIndicatorPosition - offsetFromTop)
    } else {
      // PC：現在時刻を画面上部（上から100px）に表示
      calculatedScrollPosition = Math.max(0, actualIndicatorPosition - 100)
    }
    
    scrollContainer.scrollTop = calculatedScrollPosition
  }, [currentHour, currentMinute, isMobile, mobileContainerRef])

  // Scroll to current time on component mount
  useEffect(() => {
    // 既にスクロール済みの場合は何もしない
    if (hasInitialScroll) return
    
    const attemptScroll = (attempt = 1) => {
      if (attempt > 5) {
        // Mark as initial scroll done if this was the first time
        if (setHasInitialScroll) {
          setHasInitialScroll(true)
        }
        return
      }
      
      // モバイルの場合は親コンテナを使用、それ以外は内部コンテナを使用
      const scrollContainer = isMobile && mobileContainerRef?.current 
        ? mobileContainerRef.current 
        : timelineContainerRef.current
        
      if (currentTimeIndicatorRef.current && scrollContainer) {
        // コンテナの高さが確定してからスクロール
        const containerHeight = scrollContainer.clientHeight
        if (containerHeight > 0) {
          scrollToCurrentTime()
          
          // スクロール完了後にフラグを更新
          if (setHasInitialScroll) {
            setTimeout(() => setHasInitialScroll(true), 100)
          }
        } else {
          // コンテナの高さがまだ確定していない場合は再試行
          setTimeout(() => attemptScroll(attempt + 1), 300)
        }
      } else {
        // Try again after short delay
        setTimeout(() => attemptScroll(attempt + 1), 300)
      }
    }

    // Start after DOM is ready (モバイルの場合は遅延を増やす)
    const timer = setTimeout(attemptScroll, isMobile ? 500 : 200)
    return () => clearTimeout(timer)
  }, [hasInitialScroll, setHasInitialScroll, scrollToCurrentTime, isMobile, mobileContainerRef])
  

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1 md:space-x-2">
          {/* 月ナビゲーション */}
          <div className="flex items-center space-x-0.5">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 w-7 p-0 md:h-8 md:w-8"
              onClick={() => {
                const newDate = new Date(selectedDate)
                newDate.setMonth(newDate.getMonth() - 1)
                setSelectedDate(newDate)
              }}
              title="前の月"
            >
              <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
            </Button>
            <span className="text-[10px] md:text-xs text-muted-foreground">月</span>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 w-7 p-0 md:h-8 md:w-8"
              onClick={() => {
                const newDate = new Date(selectedDate)
                newDate.setMonth(newDate.getMonth() + 1)
                setSelectedDate(newDate)
              }}
              title="次の月"
            >
              <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
            </Button>
          </div>
          
          <div className="w-px h-5 bg-border mx-1" />
          
          {/* 日ナビゲーション */}
          <Button 
            variant="ghost" 
            size="sm"
            className="h-7 w-7 p-0 md:h-8 md:w-8"
            onClick={() => {
              const newDate = new Date(selectedDate)
              newDate.setDate(newDate.getDate() - 1)
              setSelectedDate(newDate)
            }}
            title="前の日"
          >
            <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
          
          <div className="min-w-[100px] md:min-w-[140px] text-center px-1">
            <h3 className="font-medium text-xs md:text-base">
              {selectedDate.toDateString() === new Date().toDateString() 
                ? '本日' 
                : ''}
              {selectedDate.toLocaleDateString('ja-JP', { 
                month: 'long', 
                day: 'numeric', 
                weekday: 'short' 
              })}
            </h3>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="h-7 w-7 p-0 md:h-8 md:w-8"
            onClick={() => {
              const newDate = new Date(selectedDate)
              newDate.setDate(newDate.getDate() + 1)
              setSelectedDate(newDate)
            }}
            title="次の日"
          >
            <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
        </div>
        <div className="flex space-x-2">
          {selectedDate.toDateString() !== new Date().toDateString() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="text-xs md:text-sm px-2 md:px-3"
            >
              今日
            </Button>
          )}
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
          className={`flex-1 ${isMobile && mobileContainerRef ? '' : 'overflow-y-auto'}`} 
          data-timeline="true"
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {/* Due Tasks Section */}
              {dueTasks.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      本日期限のタスク
                      <span className="text-xs bg-orange-100 dark:bg-orange-900 px-2 py-0.5 rounded-full">
                        {dueTasks.length}件
                      </span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {dueTasks.map(task => (
                      <DueDateTaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Timeline */}
              <div className="relative">
            {/* Current Time Indicator */}
            <div 
              ref={currentTimeIndicatorRef}
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ 
                top: `${(() => {
                  // 15分単位のスロットインデックス
                  const currentSlotIndex = currentHour * 4 + Math.floor(currentMinute / 15)
                  // 各スロットの高さを累積計算（全スロット統一）
                  const totalHeight = currentSlotIndex * TIME_SLOT_HEIGHT
                  // 現在のスロット内でのオフセット
                  const offsetInSlot = ((currentMinute % 15) / 15) * TIME_SLOT_HEIGHT
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
                activeSlot={activeSlot}
                setActiveSlot={setActiveSlot}
                activeFormSlot={activeFormSlot}
                setActiveFormSlot={setActiveFormSlot}
                selectedDate={selectedDate}
              />
            ))}
          </div>
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
interface CalendarTaskFormProps {
  date: Date
  onSave: (taskData: any, time: string, date: Date) => void
  onCancel: () => void
}

function CalendarTaskForm({ date, onSave, onCancel }: CalendarTaskFormProps) {
  const { allCategories } = useCategoryStoreWithAuth()
  
  // 日本時間で日付をフォーマットする関数
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleSubmit = (formData: TaskFormData) => {
    const { scheduledTime, scheduledDate, ...taskData } = formData
    const finalTaskData = {
      ...taskData,
      estimatedTime: taskData.estimatedTime === '' ? 30 : taskData.estimatedTime
    }
    
    // scheduledDateをDateオブジェクトに変換
    const [year, month, day] = (scheduledDate || formatDateForInput(date)).split('-').map(Number)
    const taskDate = new Date(year, month - 1, day)
    
    onSave(finalTaskData, scheduledTime || '09:00', taskDate)
  }

  return (
    <div className="absolute top-0 left-0 right-0 bg-white dark:bg-gray-800 border border-border rounded-lg shadow-lg p-4 z-50">
      <h3 className="text-sm font-medium mb-3">
        {date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} のタスクを作成
      </h3>
      
      <CalendarAddForm
        defaultValues={{
          category: 'personal',
          estimatedTime: 30,
          scheduledTime: '09:00',
          scheduledDate: formatDateForInput(date)
        }}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        categories={allCategories}
        submitLabel="作成"
      />
    </div>
  )
}

// Calendar Task Edit Form Component
interface CalendarTaskEditFormProps {
  task: any
  slot: any
  onSave: (taskData: any, time: string, date: Date) => void
  onCancel: () => void
}

function CalendarTaskEditForm({ task, slot, onSave, onCancel }: CalendarTaskEditFormProps) {
  const { allCategories } = useCategoryStoreWithAuth()
  
  // スロットの日付をYYYY-MM-DD形式に変換
  const slotDate = slot.date instanceof Date ? slot.date : new Date(slot.date)
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const handleSubmit = (formData: TaskFormData) => {
    const { scheduledTime, scheduledDate, ...taskData } = formData
    const finalTaskData = {
      ...taskData,
      estimatedTime: taskData.estimatedTime === '' ? 30 : taskData.estimatedTime
    }
    
    // scheduledDateをDateオブジェクトに変換
    const [year, month, day] = (scheduledDate || formatDateForInput(slotDate)).split('-').map(Number)
    const taskDate = new Date(year, month - 1, day)
    
    onSave(finalTaskData, scheduledTime || slot.startTime || '09:00', taskDate)
  }

  return (
    <div className="border border-border rounded-lg p-3 md:p-4 bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">タスクを編集</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <CalendarAddForm
        defaultValues={{
          title: task.title,
          category: task.category,
          priority: task.priority,
          urgency: task.urgency,
          estimatedTime: task.estimatedTime,
          scheduledTime: slot.startTime || '09:00',
          scheduledDate: formatDateForInput(slotDate)
        }}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        categories={allCategories}
        submitLabel="保存"
      />
    </div>
  )
}

interface CalendarViewProps {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  scheduledSlots: any[]
  tasks: any[]
}

function CalendarView({ selectedDate, setSelectedDate, scheduledSlots, tasks }: CalendarViewProps) {
  const { completeTask, uncompleteTask, removeTimeSlot, addTask, moveTaskToTimeline, updateTask } = useTaskStoreWithAuth()
  const { user } = useAuth()
  
  // カレンダービューの表示モード管理
  const [calendarViewMode, setCalendarViewMode] = useState<'tasks' | 'time'>('tasks')
  
  // カレンダービューでのタスク作成管理
  const [activeFormDate, setActiveFormDate] = useState<string | null>(null)
  const [formLocation, setFormLocation] = useState<'cell' | 'section' | null>(null)
  
  // カレンダービューでのタスク編集管理
  const [editingTask, setEditingTask] = useState<any>(null)
  const [editingSlot, setEditingSlot] = useState<any>(null)
  
  // 月ごとの時間データ管理
  const [monthlyTimeLogs, setMonthlyTimeLogs] = useState<{ date: Date, workTime: number, breakTime: number }[]>([])
  const [isLoadingTimeLogs, setIsLoadingTimeLogs] = useState(false)

  // カレンダーからのタスク作成ハンドラー
  const handleCalendarTaskCreate = async (taskData: any, time: string, date: Date) => {
    if (!user) return
    
    try {
      console.log('📅 Creating task from calendar:', { taskData, time, date: date.toDateString() })
      
      // タスクを作成
      await addTask({
        title: taskData.title,
        priority: taskData.priority,
        urgency: taskData.urgency,
        category: taskData.category,
        estimatedTime: taskData.estimatedTime,
        status: 'todo'
      }, user.id)
      
      console.log('✅ Calendar task created, scheduling...')
      
      // 短い間隔で数回チェックして最新のタスクを見つけてスケジュール
      let attempts = 0
      const maxAttempts = 15
      const checkInterval = 300
      
      const findAndScheduleTask = () => {
        setTimeout(async () => {
          attempts++
          console.log(`🔍 Calendar attempt ${attempts}/${maxAttempts} to find task:`, taskData.title)
          
          try {
            // ストアから最新のタスクを動的に取得
            const { tasks: currentTasks } = useSupabaseTaskStore.getState()
            console.log('📋 Current tasks count from store:', currentTasks.length)
            
            // タイトルとカテゴリでマッチング
            const latestTask = currentTasks
              .filter(task => 
                task.title === taskData.title && 
                task.category === taskData.category &&
                task.status === 'todo' &&
                !task.scheduledDate &&
                !task.scheduledTime
              )
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
            
            console.log('🎯 Found calendar task:', latestTask?.title, latestTask?.id)
            
            if (latestTask) {
              console.log('📅 Moving calendar task to timeline...', { 
                taskId: latestTask.id, 
                time, 
                date: date.toDateString() 
              })
              
              await moveTaskToTimeline(
                latestTask.id,
                date, // 選択された日付
                time, // 選択された時間
                user.id
              )
              
              console.log('✅ Calendar task scheduled successfully!')
              setActiveFormDate(null) // 成功したらフォームを閉じる
              setFormLocation(null)
            } else if (attempts < maxAttempts) {
              console.log('⏳ Calendar task not found yet, retrying...')
              findAndScheduleTask() // 再試行
            } else {
              console.warn('⚠️ Failed to find calendar task after', maxAttempts, 'attempts')
              setActiveFormDate(null) // 失敗してもフォームを閉じる
              setFormLocation(null)
            }
          } catch (error) {
            console.error('❌ Failed to schedule calendar task:', error)
            setActiveFormDate(null) // エラー時もフォームを閉じる
            setFormLocation(null)
          }
        }, checkInterval)
      }
      
      findAndScheduleTask()
      
    } catch (error) {
      console.error('❌ Failed to create calendar task:', error)
      setActiveFormDate(null)
      setFormLocation(null)
    }
  }

  // カレンダーからのタスク編集ハンドラー
  const handleCalendarTaskEdit = async (taskData: any, time: string, date: Date) => {
    if (!user || !editingTask || !editingSlot) return
    
    try {
      console.log('📝 Editing task from calendar:', { taskData, time, date: date.toDateString(), taskId: editingTask.id })
      
      // タスクの情報を更新
      await updateTask(editingTask.id, {
        title: taskData.title,
        priority: taskData.priority,
        urgency: taskData.urgency,
        category: taskData.category,
        estimatedTime: taskData.estimatedTime
      })
      
      // 現在のスロット日付
      const currentSlotDate = editingSlot.date instanceof Date ? editingSlot.date : new Date(editingSlot.date)
      const currentDateString = currentSlotDate.toDateString()
      const newDateString = date.toDateString()
      
      // 時間または日付が変更された場合はタイムスロットを更新
      if (time !== editingSlot.startTime || currentDateString !== newDateString) {
        console.log('⏰ Time or date changed, updating schedule...')
        console.log('Current:', { date: currentDateString, time: editingSlot.startTime })
        console.log('New:', { date: newDateString, time })
        
        // 現在のスロットを削除
        await removeTimeSlot(editingSlot.id)
        
        // 新しい日付と時間でスケジュール
        await moveTaskToTimeline(editingTask.id, date, time, user.id)
      }
      
      console.log('✅ Calendar task edited successfully!')
      setEditingTask(null)
      setEditingSlot(null)
      
    } catch (error) {
      console.error('❌ Failed to edit calendar task:', error)
      setEditingTask(null)
      setEditingSlot(null)
    }
  }
  
  // 月ごとの時間データを取得
  const selectedMonth = selectedDate.getMonth()
  const selectedYear = selectedDate.getFullYear()
  
  useEffect(() => {
    if (calendarViewMode === 'time' && user) {
      const fetchMonthlyTimeLogs = async () => {
        setIsLoadingTimeLogs(true)
        try {
          const logs = await TaskService.getMonthlyTimeLogs(
            user.id,
            selectedYear,
            selectedMonth + 1 // Month is 1-based in the RPC
          )
          console.log('📊 Fetched monthly time logs:', logs)
          console.log('📊 Logs count:', logs.length)
          logs.forEach(log => {
            console.log('📊 Log entry:', {
              date: log.date,
              dateString: log.date.toDateString(),
              workTime: log.workTime,
              breakTime: log.breakTime
            })
          })
          setMonthlyTimeLogs(logs)
        } catch (error) {
          console.error('月ごとの時間データの取得に失敗しました:', error)
        } finally {
          setIsLoadingTimeLogs(false)
        }
      }
      
      fetchMonthlyTimeLogs()
    }
  }, [calendarViewMode, selectedMonth, selectedYear, user])
  
  // 🔍 カレンダービューのデバッグログ
  console.log('🔍 CalendarView Debug Info:')
  console.log('📅 Selected Date:', selectedDate.toDateString())
  console.log('📊 scheduledSlots passed to calendar:', scheduledSlots.length)
  console.log('📋 tasks passed to calendar:', tasks.length)
  
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
  
  // Group time logs by date
  const timeLogsByDate: { [key: string]: { workTime: number, breakTime: number } } = {}
  console.log('📊 Processing monthlyTimeLogs for timeLogsByDate:', monthlyTimeLogs.length)
  monthlyTimeLogs.forEach(log => {
    const dateKey = log.date.toDateString()
    console.log('📊 Adding to timeLogsByDate:', {
      dateKey,
      workTime: log.workTime,
      breakTime: log.breakTime
    })
    timeLogsByDate[dateKey] = {
      workTime: log.workTime,
      breakTime: log.breakTime
    }
  })
  console.log('📊 Final timeLogsByDate:', timeLogsByDate)
  
  // Add scheduled tasks
  scheduledSlots.forEach(slot => {
    const slotDate = slot.date instanceof Date ? slot.date : new Date(slot.date)
    const dateKey = slotDate.toDateString()
    const task = tasks.find(t => t.id === slot.taskId)
    console.log('🔗 Calendar mapping slot to task:', { 
      slotId: slot.id, 
      taskId: slot.taskId, 
      dateKey, 
      foundTask: !!task,
      taskTitle: task?.title 
    })
    if (task) {
      if (!tasksByDate[dateKey]) {
        tasksByDate[dateKey] = []
      }
      tasksByDate[dateKey].push({ task, slot })
    }
  })
  
  // Add tasks with due dates
  tasks.forEach(task => {
    if (task.dueDate) {
      const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)
      const dateKey = dueDate.toDateString()
      
      // Skip if already scheduled on this date
      if (!tasksByDate[dateKey]?.some(({ task: t }) => t.id === task.id)) {
        if (!tasksByDate[dateKey]) {
          tasksByDate[dateKey] = []
        }
        tasksByDate[dateKey].push({ 
          task, 
          slot: { 
            id: `due-${task.id}`, 
            isDueDate: true,
            date: dueDate,
            startTime: null,
            endTime: null 
          } 
        })
      }
    }
  })
  
  console.log('📊 tasksByDate result:', tasksByDate)
  console.log('📊 Total dates with tasks:', Object.keys(tasksByDate).length)
  
  // Get tasks for selected date
  const selectedDateKey = selectedDate.toDateString()
  const scheduledTasksForDate = tasksByDate[selectedDateKey] || []
  
  // Get tasks with due date matching selected date
  const dueTasksForDate = tasks.filter(task => {
    if (!task.dueDate) return false
    const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)
    return dueDate.toDateString() === selectedDateKey && !scheduledTasksForDate.some(({ task: scheduledTask }) => scheduledTask.id === task.id)
  }).map(task => ({ 
    task, 
    slot: { 
      id: `due-${task.id}`, 
      isDueDate: true,
      date: selectedDate,
      startTime: null,
      endTime: null 
    } 
  }))
  
  const selectedDateTasks = [...scheduledTasksForDate, ...dueTasksForDate]
  
  console.log('🎯 Selected date tasks:', selectedDateTasks.length)
  console.log('🎯 Selected date tasks content:', selectedDateTasks)
  
  return (
    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-4">
      {/* View Mode Toggle */}
      <div className="flex justify-center mb-4">
        <ToggleGroup 
          type="single" 
          value={calendarViewMode} 
          onValueChange={(value) => value && setCalendarViewMode(value as 'tasks' | 'time')}
          className="bg-muted/50 p-1 rounded-lg"
        >
          <ToggleGroupItem 
            value="tasks" 
            aria-label="タスク表示" 
            className="px-3 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            <ListTodo className="w-4 h-4 mr-2" />
            タスク
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="time" 
            aria-label="時間表示" 
            className="px-3 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            <Timer className="w-4 h-4 mr-2" />
            時間
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      
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
          const dayTimeLog = timeLogsByDate[dateKey]
          const dayOfWeek = day.getDay()
          
          // Debug logging for time display
          if (calendarViewMode === 'time' && isCurrentMonth && dayTimeLog) {
            console.log('📊 Day with time log:', {
              date: day.toDateString(),
              dateKey,
              dayTimeLog
            })
          }
          
          return (
            <Card
              key={index}
              className={`group min-h-[60px] md:min-h-[100px] p-1 md:p-2 cursor-pointer transition-colors relative ${
                !isCurrentMonth ? 'opacity-50' : ''
              } ${
                isToday ? 'ring-1 md:ring-2 ring-blue-500' : ''
              } ${
                isSelected ? 'bg-blue-50 dark:bg-blue-950/30' : ''
              } hover:bg-gray-50 dark:hover:bg-gray-800`}
              onClick={() => setSelectedDate(day)}
            >
              <div className="flex flex-col h-full">
                <div className={`flex items-center justify-between text-xs md:text-sm font-medium mb-0.5 md:mb-1 ${
                  dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : ''
                }`}>
                  <span>{day.getDate()}</span>
                  {/* Add Task Button */}
                  {isCurrentMonth && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedDate(day)
                        setActiveFormDate(dateKey)
                        setFormLocation('section')
                      }}
                      title="タスクを追加"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div className="flex-1 space-y-1 overflow-y-auto">
                  {calendarViewMode === 'tasks' ? (
                    <>
                      {/* Desktop view - show task names */}
                      <div className="hidden md:block space-y-1">
                        {dayTasks.slice(0, 3).map(({ task, slot }, taskIndex) => (
                      <div
                        key={taskIndex}
                        className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${
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
                        title={`${task.title} (クリックで編集)`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingTask(task)
                          setEditingSlot(slot)
                        }}
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
                        className={`w-2 h-2 rounded-full cursor-pointer hover:scale-125 transition-transform ${
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
                        title={`${task.title} (タップで編集)`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingTask(task)
                          setEditingSlot(slot)
                        }}
                      />
                    ))}
                  </div>
                    </>
                  ) : (
                    /* Time view - show work and break times */
                    <div className="flex flex-col justify-center items-center h-full space-y-1">
                      {dayTimeLog && (dayTimeLog.workTime > 0 || dayTimeLog.breakTime > 0) ? (
                        <>
                          {dayTimeLog.workTime > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                              <Clock className="w-3 h-3 text-blue-500" />
                              <span className="text-blue-700 dark:text-blue-300 font-medium">
                                {formatSecondsToHM(dayTimeLog.workTime)}
                              </span>
                            </div>
                          )}
                          {dayTimeLog.breakTime > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                              <Timer className="w-3 h-3 text-green-500" />
                              <span className="text-green-700 dark:text-green-300 font-medium">
                                {formatSecondsToHM(dayTimeLog.breakTime)}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        /* No time logs for this day */
                        isCurrentMonth && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )
                      )}
                    </div>
                  )}
                </div>
                
              </div>
            </Card>
          )
        })}
      </div>
      
      {/* Selected Date Tasks or Time Summary */}
      <div className="mt-4">
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm md:text-base font-semibold text-foreground">
              {selectedDate.toLocaleDateString('ja-JP', { 
                month: 'long', 
                day: 'numeric', 
                weekday: 'long' 
              })}の{calendarViewMode === 'tasks' ? 'タスク' : '時間記録'}
            </h3>
            {calendarViewMode === 'tasks' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveFormDate(selectedDate.toDateString())
                  setFormLocation('section')
                }}
                className="h-7 px-2 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                タスク追加
              </Button>
            )}
          </div>
          <Separator className="mt-2" />
        </div>
        
        {calendarViewMode === 'tasks' ? (
          /* Task mode display */
          selectedDateTasks.length === 0 ? (
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
                    onEdit={() => {
                      setEditingTask(task)
                      setEditingSlot(slot)
                    }}
                  />
                ))
              }
            </div>
          )
        ) : (
          /* Time mode display */
          <div className="space-y-4">
            {timeLogsByDate[selectedDate.toDateString()] ? (
              <>
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">作業時間</p>
                      <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                        {formatSecondsToHM(timeLogsByDate[selectedDate.toDateString()].workTime)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Timer className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">休憩時間</p>
                      <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                        {formatSecondsToHM(timeLogsByDate[selectedDate.toDateString()].breakTime)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Timer className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">この日の時間記録はありません</p>
              </div>
            )}
          </div>
        )}
        
        {/* Task Creation Form for Selected Date */}
        {activeFormDate === selectedDate.toDateString() && formLocation === 'section' && (
          <div className="mt-4 relative">
            <CalendarTaskForm
              date={selectedDate}
              onSave={(taskData, time, date) => handleCalendarTaskCreate(taskData, time, date)}
              onCancel={() => {
                setActiveFormDate(null)
                setFormLocation(null)
              }}
            />
          </div>
        )}
        
        {/* Task Edit Form for Selected Date */}
        {editingTask && editingSlot && (
          <div className="mt-4 relative">
            <CalendarTaskEditForm
              task={editingTask}
              slot={editingSlot}
              onSave={(taskData, time, date) => handleCalendarTaskEdit(taskData, time, date)}
              onCancel={() => {
                setEditingTask(null)
                setEditingSlot(null)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Due Date Task Card Component
interface DueDateTaskCardProps {
  task: Task
}

function DueDateTaskCard({ task }: DueDateTaskCardProps) {
  const [showDetail, setShowDetail] = useState(false)
  const { updateTask, moveTaskToTimeline } = useTaskStoreWithAuth()
  const { user } = useAuth()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `due-task-${task.id}`,
    data: {
      type: 'due-task',
      task: task
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const categoryInfo = useCategoryStoreWithAuth().allCategories.find(c => c.id === task.category)
  const dueDateInfo = getDueDateInfo(task.dueDate)

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`relative ${isDragging ? 'opacity-50' : ''}`}
      >
        <Card 
          className={`p-3 hover:shadow-md transition-all cursor-move ${
            isDragging ? 'shadow-lg ring-2 ring-primary' : ''
          }`}
          {...attributes}
          {...listeners}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 
                className="font-medium text-sm truncate mb-1 cursor-pointer hover:text-primary transition-colors"
                onClick={() => setShowDetail(true)}
              >
                {task.title}
              </h4>
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {/* Category */}
                {categoryInfo && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted">
                    <span>{categoryInfo.icon}</span>
                    <span>{categoryInfo.name}</span>
                  </div>
                )}
                {/* Estimated time */}
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{task.estimatedTime}分</span>
                </div>
                {/* Due date */}
                {dueDateInfo && (
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${dueDateInfo.colorClass}`}>
                    <CalendarDays className="w-3 h-3" />
                    <span>{dueDateInfo.text}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
      <TaskDetailModal
        task={task}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onSave={(taskId, updates) => {
          updateTask(taskId, updates)
          setShowDetail(false)
        }}
      />
    </>
  )
}

// Selected Date Task Card Component
interface SelectedDateTaskCardProps {
  task: any
  slot: any
  onComplete: () => void
  onUncomplete: () => void
  onRemove: () => void
  onEdit: () => void
}

function SelectedDateTaskCard({ task, slot, onComplete, onUncomplete, onRemove, onEdit }: SelectedDateTaskCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const { updateTask } = useTaskStoreWithAuth()
  const isCompleted = task.status === 'completed'
  
  return (
    <>
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
            <h4 
              className={`font-medium text-sm md:text-base truncate cursor-pointer hover:text-primary transition-colors ${
                isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
              }`}
              onClick={() => setShowDetail(true)}
            >
              {task.title}
            </h4>
            {isCompleted && (
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            )}
          </div>
          
          {/* Time and Duration */}
          <div className="flex items-center space-x-4 mb-2 text-xs md:text-sm text-muted-foreground">
            {slot.isDueDate ? (
              <div className="flex items-center space-x-1 text-orange-600 font-medium">
                <CalendarDays className="w-3 h-3" />
                <span>期限日</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{slot.startTime || '時間未設定'}</span>
                {slot.endTime && (
                  <span>- {slot.endTime}</span>
                )}
              </div>
            )}
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
            {/* メモアイコン */}
            {task.notes && (
              <div className="flex items-center space-x-1 text-amber-600" title="メモあり">
                <FileText className="w-3 h-3" />
                <span className="text-xs">メモ</span>
              </div>
            )}
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
                  className="h-6 w-6 p-0 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600"
                  onClick={onEdit}
                  title="編集"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                {!slot.isDueDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-200 dark:hover:bg-red-800 text-red-600"
                    onClick={onRemove}
                    title="削除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
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
      <TaskDetailModal
        task={task}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onSave={(taskId, updates) => {
          updateTask(taskId, updates)
          setShowDetail(false)
        }}
      />
    </>
  )
}