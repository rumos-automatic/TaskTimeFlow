export type Priority = 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'in_progress' | 'completed'
export type TaskCategory = 'work' | 'personal' | 'custom'

export interface Task {
  id: string
  title: string
  description?: string
  priority: Priority
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