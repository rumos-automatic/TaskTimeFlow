'use client'

import { useState, useEffect } from 'react'
import { useCreateTask } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
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
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CalendarIcon, 
  Clock, 
  Zap, 
  MapPin, 
  Tag, 
  X,
  Loader2,
  Plus
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { CreateTaskInput, TaskPriority, EnergyLevel, TaskContext, TaskStatus } from '@/types/tasks'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  defaultStatus?: TaskStatus
}

export function CreateTaskModal({ isOpen, onClose, projectId, defaultStatus = 'todo' }: CreateTaskModalProps) {
  const { user } = useAuth()
  const createTaskMutation = useCreateTask()

  // Form state
  const [formData, setFormData] = useState<Partial<CreateTaskInput>>({
    title: '',
    description: '',
    project_id: projectId,
    priority: 'medium',
    energy_level: 'medium',
    status: defaultStatus,
    labels: [],
    estimated_duration: undefined,
    start_time: undefined,
    end_time: undefined,
    context: undefined
  })

  const [newLabel, setNewLabel] = useState('')
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        project_id: projectId,
        priority: 'medium',
        energy_level: 'medium',
        status: defaultStatus,
        labels: [],
        estimated_duration: undefined,
        start_time: undefined,
        end_time: undefined,
        context: undefined
      })
      setNewLabel('')
    }
  }, [isOpen, projectId, defaultStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title?.trim()) {
      return
    }

    const taskInput: CreateTaskInput = {
      ...formData,
      title: formData.title.trim(),
      project_id: projectId,
      assignee_id: user?.id
    }

    const result = await createTaskMutation.mutateAsync(taskInput)
    
    if (result.data) {
      onClose()
    }
  }

  const addLabel = () => {
    if (newLabel.trim() && !formData.labels?.includes(newLabel.trim())) {
      setFormData(prev => ({
        ...prev,
        labels: [...(prev.labels || []), newLabel.trim()]
      }))
      setNewLabel('')
    }
  }

  const removeLabel = (labelToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels?.filter(label => label !== labelToRemove) || []
    }))
  }

  const handleDateSelect = (date: Date | undefined, type: 'start' | 'end') => {
    if (date) {
      const isoString = date.toISOString()
      setFormData(prev => ({
        ...prev,
        [type === 'start' ? 'start_time' : 'end_time']: isoString
      }))
    }
    setShowDatePicker(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新しいタスクを作成</DialogTitle>
          <DialogDescription>
            プロジェクトに新しいタスクを追加します。
          </DialogDescription>
        </DialogHeader>

        {createTaskMutation.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {createTaskMutation.error instanceof Error ? createTaskMutation.error.message : String(createTaskMutation.error) || 'タスクの作成に失敗しました'}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">タスク名 *</Label>
            <Input
              id="title"
              placeholder="タスクのタイトルを入力..."
              value={formData.title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              placeholder="タスクの詳細を入力..."
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Priority and Energy Level Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>優先度</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: TaskPriority) => 
                  setFormData(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🔴 緊急</SelectItem>
                  <SelectItem value="high">🟡 高</SelectItem>
                  <SelectItem value="medium">🟢 中</SelectItem>
                  <SelectItem value="low">⚪ 低</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>エネルギーレベル</Label>
              <Select
                value={formData.energy_level}
                onValueChange={(value: EnergyLevel) => 
                  setFormData(prev => ({ ...prev, energy_level: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">⚡ 高</SelectItem>
                  <SelectItem value="medium">🔋 中</SelectItem>
                  <SelectItem value="low">🪫 低</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Context and Estimated Duration Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>実行場所</Label>
              <Select
                value={formData.context || ''}
                onValueChange={(value: TaskContext) => 
                  setFormData(prev => ({ ...prev, context: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="場所を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anywhere">🌍 どこでも</SelectItem>
                  <SelectItem value="pc_required">💻 PC必須</SelectItem>
                  <SelectItem value="home_only">🏠 自宅のみ</SelectItem>
                  <SelectItem value="office_only">🏢 オフィスのみ</SelectItem>
                  <SelectItem value="phone_only">📱 スマホのみ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">予定時間（分）</Label>
              <Input
                id="estimatedDuration"
                type="number"
                placeholder="60"
                min="1"
                value={formData.estimated_duration || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  estimated_duration: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>開始日時</Label>
              <Popover open={showDatePicker === 'start'} onOpenChange={(open) => setShowDatePicker(open ? 'start' : null)}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_time ? formatDate(formData.start_time) : '日時を選択'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.start_time ? new Date(formData.start_time) : undefined}
                    onSelect={(date) => handleDateSelect(date, 'start')}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>終了日時</Label>
              <Popover open={showDatePicker === 'end'} onOpenChange={(open) => setShowDatePicker(open ? 'end' : null)}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.end_time ? formatDate(formData.end_time) : '日時を選択'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.end_time ? new Date(formData.end_time) : undefined}
                    onSelect={(date) => handleDateSelect(date, 'end')}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label>ラベル</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="ラベルを追加..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLabel())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addLabel}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.labels && formData.labels.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.labels.map((label) => (
                  <Badge key={label} variant="secondary" className="flex items-center space-x-1">
                    <span>{label}</span>
                    <button
                      type="button"
                      onClick={() => removeLabel(label)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={!formData.title?.trim() || createTaskMutation.isPending}
          >
            {createTaskMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                作成中...
              </>
            ) : (
              'タスクを作成'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateTaskModal