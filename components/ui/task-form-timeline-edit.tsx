'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TaskFormData, BaseTaskForm } from './task-form'

export interface TimelineEditFormProps {
  defaultValues?: Partial<TaskFormData>
  onSubmit: (data: TaskFormData) => void | Promise<void>
  onCancel?: () => void
  categories: Array<{ id: string; name: string; icon?: string }>
  submitLabel?: string
  className?: string
  selectedTime: string
  onTimeChange: (time: string) => void
}

export function TimelineEditForm({
  defaultValues,
  onSubmit,
  onCancel,
  categories,
  submitLabel = '保存',
  className,
  selectedTime,
  onTimeChange
}: TimelineEditFormProps) {
  // 30分間隔の時間オプション
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2)
    const minute = (i % 2) * 30
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  })

  return (
    <div className={cn('space-y-3', className)}>
      {/* 時間選択フィールド */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          開始時間
        </label>
        <select
          value={selectedTime}
          onChange={(e) => onTimeChange(e.target.value)}
          className="w-full px-2 py-1 border border-border rounded text-xs bg-background"
        >
          {timeOptions.map((time) => (
            <option key={time} value={time}>{time}</option>
          ))}
        </select>
      </div>

      {/* 基本フォーム */}
      <BaseTaskForm
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        onCancel={onCancel}
        categories={categories}
        variant="compact"
        size="sm"
        submitLabel={submitLabel}
      />
    </div>
  )
}