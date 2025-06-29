export type Priority = 'high' | 'low'
export type Urgency = 'high' | 'low'
export type TaskStatus = 'todo' | 'in_progress' | 'completed'
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

// Category system - supports both built-in and custom categories
export type BuiltInCategory = 'work' | 'personal' | 'google-tasks'
export type TaskCategory = string // Now supports custom categories

export interface Task {
  id: string
  title: string
  description?: string
  priority: Priority
  urgency: Urgency
  category: TaskCategory
  estimatedTime: number // in minutes
  actualTime?: number // in minutes
  status: TaskStatus
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
  // Timeline placement
  scheduledDate?: Date
  scheduledTime?: string
  duration?: number // in minutes
  // Recurring task fields
  isRecurring?: boolean
  recurrenceType?: RecurrenceType
  recurrenceInterval?: number
  recurrenceEndDate?: Date
  parentRecurringTaskId?: string
  recurringPattern?: RecurringPattern
  // Rich text notes
  notes?: string
}

export interface TimeSlot {
  id: string
  taskId?: string
  date: Date
  startTime: string
  endTime: string
  type: 'task' | 'event'
}

export interface TimerState {
  isRunning: boolean
  isPaused: boolean
  timeRemaining: number // in seconds
  totalTime: number // in seconds
  currentTaskId?: string
  completedPomodoros: number
}

export interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  date: Date
  type: 'event'
  color: string
}

// Custom Category Management
export interface CustomCategory {
  id: string
  name: string
  color: string
  icon?: string
  description?: string
  isBuiltIn: boolean
  userId: string
  order: number
  createdAt: Date
  updatedAt: Date
}

// Category filter type for UI
export type CategoryFilter = TaskCategory | 'all'

// Built-in category configurations
export interface BuiltInCategoryConfig {
  id: BuiltInCategory
  name: string
  color: string
  icon: string
  description: string
  isBuiltIn: true
  order: number
}

// Google Tasks sync status
export interface GoogleTasksSyncStatus {
  isEnabled: boolean
  lastSync?: Date
  syncStatus: 'idle' | 'syncing' | 'error'
  errorMessage?: string
}

// Recurring task pattern interface
export interface RecurringPattern {
  daysOfWeek?: number[] // 0=Sunday, 1=Monday, etc. for weekly recurrence
  dayOfMonth?: number // for monthly recurrence
  monthOfYear?: number // for yearly recurrence
  excludeDates?: Date[] // dates to skip
}