'use client'

import { useState, useEffect } from 'react'
import { useCreateTimelineSlot } from '@/hooks/useTimeline'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock, 
  Calendar, 
  AlertTriangle,
  Zap,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTaskDuration, getTaskPriorityColor } from '@/lib/tasks'
import { detectTimelineConflicts } from '@/lib/timeline'
import type { Task } from '@/types/tasks'
import type { CreateTimelineSlotInput, TimelineConflict } from '@/types/timeline'

interface CreateSlotModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date
  initialTime?: { hour: number; minute: number } | null
  availableTasks: Task[]
  preselectedTask?: Task
}

export function CreateSlotModal({ 
  isOpen, 
  onClose, 
  date, 
  initialTime, 
  availableTasks,
  preselectedTask 
}: CreateSlotModalProps) {
  const createSlotMutation = useCreateTimelineSlot()
  
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [startHour, setStartHour] = useState(initialTime?.hour || 9)
  const [startMinute, setStartMinute] = useState(initialTime?.minute || 0)
  const [endHour, setEndHour] = useState(initialTime?.hour || 10)
  const [endMinute, setEndMinute] = useState(initialTime?.minute || 0)
  const [conflicts, setConflicts] = useState<TimelineConflict[]>([])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedTaskId(preselectedTask?.id || '')
      setStartHour(initialTime?.hour || 9)
      setStartMinute(initialTime?.minute || 0)
      
      // Calculate end time based on selected task duration
      if (preselectedTask?.estimated_duration) {
        const duration = preselectedTask.estimated_duration
        const endTime = new Date()
        endTime.setHours(initialTime?.hour || 9, (initialTime?.minute || 0) + duration)
        setEndHour(endTime.getHours())
        setEndMinute(endTime.getMinutes())
      } else {
        setEndHour((initialTime?.hour || 9) + 1)
        setEndMinute(initialTime?.minute || 0)
      }
      
      setConflicts([])
    }
  }, [isOpen, initialTime, preselectedTask])

  // Update end time when selected task changes
  useEffect(() => {
    const selectedTask = availableTasks.find(task => task.id === selectedTaskId)
    if (selectedTask?.estimated_duration) {
      const duration = selectedTask.estimated_duration
      const startTime = new Date()
      startTime.setHours(startHour, startMinute, 0, 0)
      const endTime = new Date(startTime.getTime() + duration * 60000)
      setEndHour(endTime.getHours())
      setEndMinute(endTime.getMinutes())
    }
  }, [selectedTaskId, availableTasks])

  // Check for conflicts when time changes
  useEffect(() => {
    if (selectedTaskId) {
      const startTime = new Date(date)
      startTime.setHours(startHour, startMinute, 0, 0)
      const endTime = new Date(date)
      endTime.setHours(endHour, endMinute, 0, 0)
      
      // Here we would check against existing timeline slots
      // For now, we'll just do basic validation
      const detectedConflicts: TimelineConflict[] = []
      
      if (endTime <= startTime) {
        detectedConflicts.push({
          type: 'overlap',
          description: '終了時刻は開始時刻より後である必要があります',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          conflicting_items: [],
          severity: 'error'
        })
      }
      
      setConflicts(detectedConflicts)
    }
  }, [selectedTaskId, startHour, startMinute, endHour, endMinute, date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedTaskId || conflicts.some(c => c.severity === 'error')) {
      return
    }

    const startTime = new Date(date)
    startTime.setHours(startHour, startMinute, 0, 0)
    const endTime = new Date(date)
    endTime.setHours(endHour, endMinute, 0, 0)

    const slotInput: CreateTimelineSlotInput = {
      task_id: selectedTaskId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      date: date.toISOString().split('T')[0]
    }

    const result = await createSlotMutation.mutateAsync(slotInput)
    
    if (result.data) {
      onClose()
    }
  }

  const selectedTask = availableTasks.find(task => task.id === selectedTaskId)
  const duration = selectedTask ? 
    Math.round((new Date().setHours(endHour, endMinute) - new Date().setHours(startHour, startMinute)) / (1000 * 60)) : 0

  const hasErrors = conflicts.some(c => c.severity === 'error')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>タスクをスケジュール</DialogTitle>
          <DialogDescription>
            {date.toLocaleDateString('ja-JP', { 
              year: 'numeric',
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </DialogDescription>
        </DialogHeader>

        {createSlotMutation.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {createSlotMutation.error.error || 'スケジュールの作成に失敗しました'}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Selection */}
          <div className="space-y-2">
            <Label htmlFor="task">タスク *</Label>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId} required>
              <SelectTrigger>
                <SelectValue placeholder="タスクを選択してください" />
              </SelectTrigger>
              <SelectContent>
                {availableTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        task.priority === 'urgent' ? 'bg-danger-500' :
                        task.priority === 'high' ? 'bg-warning-500' :
                        task.priority === 'medium' ? 'bg-tasktime-500' : 'bg-success-500'
                      )} />
                      <span className="truncate">{task.title}</span>
                      {task.estimated_duration && (
                        <span className="text-xs text-gray-500 ml-auto">
                          {formatTaskDuration(task.estimated_duration)}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Task Details */}
          {selectedTask && (
            <Card className="bg-gray-50">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{selectedTask.title}</h4>
                    {selectedTask.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {selectedTask.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={getTaskPriorityColor(selectedTask.priority)}>
                        {selectedTask.priority === 'urgent' ? '緊急' :
                         selectedTask.priority === 'high' ? '高' :
                         selectedTask.priority === 'medium' ? '中' : '低'}
                      </Badge>
                      {selectedTask.energy_level && (
                        <Badge variant="outline">
                          <Zap className="h-3 w-3 mr-1" />
                          {selectedTask.energy_level === 'high' ? '高' :
                           selectedTask.energy_level === 'medium' ? '中' : '低'}エネルギー
                        </Badge>
                      )}
                    </div>
                  </div>
                  {selectedTask.estimated_duration && (
                    <div className="text-xs text-gray-500 ml-4">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {formatTaskDuration(selectedTask.estimated_duration)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>開始時刻</Label>
              <div className="flex space-x-2">
                <Select value={startHour.toString()} onValueChange={(value) => setStartHour(parseInt(value))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(24)].map((_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={startMinute.toString()} onValueChange={(value) => setStartMinute(parseInt(value))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 15, 30, 45].map((minute) => (
                      <SelectItem key={minute} value={minute.toString()}>
                        {minute.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>終了時刻</Label>
              <div className="flex space-x-2">
                <Select value={endHour.toString()} onValueChange={(value) => setEndHour(parseInt(value))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(24)].map((_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={endMinute.toString()} onValueChange={(value) => setEndMinute(parseInt(value))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 15, 30, 45].map((minute) => (
                      <SelectItem key={minute} value={minute.toString()}>
                        {minute.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Duration Display */}
          {selectedTask && duration > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">継続時間</span>
              </div>
              <div className="text-sm font-medium">
                {Math.floor(duration / 60)}時間{duration % 60}分
              </div>
            </div>
          )}

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <div className="space-y-2">
              {conflicts.map((conflict, index) => (
                <Alert key={index} variant={conflict.severity === 'error' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {conflict.description}
                    {conflict.suggested_resolution && (
                      <div className="mt-1 text-xs">
                        推奨: {conflict.suggested_resolution}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={!selectedTaskId || hasErrors || createSlotMutation.isPending}
          >
            {createSlotMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                作成中...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                スケジュール作成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateSlotModal