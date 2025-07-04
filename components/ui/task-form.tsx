'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Task, Priority, Urgency, TaskCategory } from '@/lib/types'
import { AlertCircle, Clock, Calendar, X, Plus } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'

// Variant definitions for different contexts
const taskFormVariants = cva(
  'space-y-3',
  {
    variants: {
      variant: {
        compact: 'p-3',
        standard: 'p-4',
        extended: 'p-4'
      },
      size: {
        sm: 'text-xs',
        default: 'text-sm',
        lg: 'text-base'
      }
    },
    defaultVariants: {
      variant: 'standard',
      size: 'default'
    }
  }
)

// Form data type
export interface TaskFormData {
  title: string
  priority: Priority
  urgency: Urgency
  category: TaskCategory
  estimatedTime: number | ''
  // Extended fields for calendar
  scheduledDate?: string
  scheduledTime?: string
}

// Props for the base task form
export interface BaseTaskFormProps extends VariantProps<typeof taskFormVariants> {
  defaultValues?: Partial<TaskFormData>
  onSubmit: (data: TaskFormData) => void | Promise<void>
  onCancel?: () => void
  categories: Array<{ id: string; name: string; icon?: string }>
  showDateTimePicker?: boolean
  submitLabel?: string
  cancelLabel?: string
  className?: string
  autoFocus?: boolean
  header?: React.ReactNode
}

// Priority/Urgency option configuration
const priorityOptions = [
  { value: 'high', label: '高', description: '非常に重要', color: 'text-red-500' },
  { value: 'low', label: '低', description: 'あまり重要でない', color: 'text-green-500' }
] as const

const urgencyOptions = [
  { value: 'high', label: '高', description: '早めに対応', color: 'text-purple-600' },
  { value: 'low', label: '低', description: '時間に余裕あり', color: 'text-blue-600' }
] as const

// Time options for estimated time dropdown
const timeOptions = [
  { value: 15, label: '15分' },
  { value: 30, label: '30分' },
  { value: 45, label: '45分' },
  { value: 60, label: '1時間' },
  { value: 90, label: '1時間30分' },
  { value: 120, label: '2時間' },
  { value: 180, label: '3時間' },
  { value: 240, label: '4時間' },
  { value: 300, label: '5時間' },
  { value: 360, label: '6時間' },
  { value: 420, label: '7時間' },
  { value: 480, label: '8時間' }
] as const

// Base Task Form Component
export function BaseTaskForm({
  defaultValues,
  onSubmit,
  onCancel,
  categories,
  showDateTimePicker = false,
  submitLabel = '作成',
  cancelLabel = 'キャンセル',
  variant,
  size,
  className,
  autoFocus = true,
  header
}: BaseTaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    priority: 'low',
    urgency: 'low',
    category: categories[0]?.id || 'work',
    estimatedTime: 30,
    ...defaultValues
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Update form data only on initial mount or when component key changes
  useEffect(() => {
    if (defaultValues && !hasInitialized) {
      setFormData(prev => ({ ...prev, ...defaultValues }))
      setHasInitialized(true)
    }
  }, [defaultValues, hasInitialized])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Time options for calendar view (30-minute intervals)
  const scheduleTimeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2)
    const minute = (i % 2) * 30
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  })

  const inputSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
  const selectSize = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-10' : 'h-8'

  return (
    <form onSubmit={handleSubmit} className={cn(taskFormVariants({ variant, size }), className)}>
      {header}
      
      {/* Task Title Input */}
      <div>
        <Input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="タスク名を入力..."
          className={cn(inputSize, 'w-full')}
          autoFocus={autoFocus}
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Priority and Urgency Selection */}
      <div className="grid grid-cols-2 gap-2">
        {/* Priority */}
        <div className={variant === 'standard' ? 'border border-border rounded-lg p-2 bg-background' : ''}>
          {variant === 'standard' && (
            <Label className={cn(inputSize, 'font-medium mb-1 flex items-center')}>
              <AlertCircle className="w-3 h-3 mr-1 text-red-500" />
              優先度
            </Label>
          )}
          <Select
            value={formData.priority}
            onValueChange={(value: Priority) => setFormData(prev => ({ ...prev, priority: value }))}
            disabled={isSubmitting}
          >
            <SelectTrigger className={cn(inputSize, selectSize)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <span className={cn('flex items-center', inputSize)}>
                    {variant === 'compact' ? `優先度：${option.label}` : (
                      <>
                        <span className={option.color}>{option.label}</span>
                        {variant === 'standard' && (
                          <span className="ml-2 text-muted-foreground">- {option.description}</span>
                        )}
                      </>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Urgency */}
        <div className={variant === 'standard' ? 'border border-border rounded-lg p-2 bg-background' : ''}>
          {variant === 'standard' && (
            <Label className={cn(inputSize, 'font-medium mb-1 flex items-center')}>
              <Clock className="w-3 h-3 mr-1 text-purple-600" />
              緊急度
            </Label>
          )}
          <Select
            value={formData.urgency}
            onValueChange={(value: Urgency) => setFormData(prev => ({ ...prev, urgency: value }))}
            disabled={isSubmitting}
          >
            <SelectTrigger className={cn(inputSize, selectSize)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {urgencyOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <span className={cn('flex items-center', inputSize)}>
                    {variant === 'compact' ? `緊急度：${option.label}` : (
                      <>
                        <span className={option.color}>{option.label}</span>
                        {variant === 'standard' && (
                          <span className="ml-2 text-muted-foreground">- {option.description}</span>
                        )}
                      </>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Category and Estimated Time */}
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={formData.category}
          onValueChange={(value: TaskCategory) => setFormData(prev => ({ ...prev, category: value }))}
          disabled={isSubmitting}
        >
          <SelectTrigger className={cn(inputSize, selectSize)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <span className={inputSize}>
                  {category.icon || ''} {category.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(formData.estimatedTime)}
          onValueChange={(value) => setFormData(prev => ({ ...prev, estimatedTime: parseInt(value) }))}
          disabled={isSubmitting}
        >
          <SelectTrigger className={cn(inputSize, selectSize)}>
            <SelectValue placeholder="時間を選択" />
          </SelectTrigger>
          <SelectContent>
            {timeOptions.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                <span className={inputSize}>{option.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date and Time Picker (for extended variant) */}
      {showDateTimePicker && (
        <div>
          <Label className={cn(inputSize, 'font-medium mb-1 flex items-center')}>
            <Calendar className="w-3 h-3 mr-1" />
            日付と開始時間
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={formData.scheduledDate || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
              className={cn(inputSize, selectSize)}
              disabled={isSubmitting}
            />
            <Select
              value={formData.scheduledTime || '09:00'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, scheduledTime: value }))}
              disabled={isSubmitting}
            >
              <SelectTrigger className={cn(inputSize, selectSize)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scheduleTimeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    <span className={inputSize}>{time}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2 pt-1">
        <Button 
          type="submit" 
          size={size === 'sm' ? 'sm' : 'default'}
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? '処理中...' : submitLabel}
        </Button>
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            size={size === 'sm' ? 'sm' : 'default'}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel === 'キャンセル' ? <X className="w-4 h-4" /> : cancelLabel}
          </Button>
        )}
      </div>
    </form>
  )
}

// Wrapper components for specific contexts
export function TaskPoolAddForm(props: Omit<BaseTaskFormProps, 'variant'>) {
  return <BaseTaskForm {...props} variant="standard" />
}

export function TimelineAddForm(props: Omit<BaseTaskFormProps, 'variant' | 'size'>) {
  return <BaseTaskForm {...props} variant="compact" size="sm" />
}

export function CalendarAddForm(props: Omit<BaseTaskFormProps, 'variant' | 'showDateTimePicker'>) {
  return <BaseTaskForm {...props} variant="extended" showDateTimePicker={true} />
}