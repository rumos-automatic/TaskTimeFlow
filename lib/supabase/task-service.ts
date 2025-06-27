import { supabase } from './client'
import { Database } from './types'
import { Task, TimeSlot, Priority, Urgency, TaskStatus, TaskCategory } from '@/lib/types'

type DbTask = Database['public']['Tables']['tasks']['Row']
type DbTaskInsert = Database['public']['Tables']['tasks']['Insert']
type DbTaskUpdate = Database['public']['Tables']['tasks']['Update']

type DbTimeSlot = Database['public']['Tables']['time_slots']['Row']
type DbTimeSlotInsert = Database['public']['Tables']['time_slots']['Insert']
type DbTimeSlotUpdate = Database['public']['Tables']['time_slots']['Update']

// Database models to App models conversion
export function dbTaskToTask(dbTask: DbTask): Task {
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description || undefined,
    priority: dbTask.priority as Priority,
    urgency: dbTask.urgency as Urgency,
    category: dbTask.category as TaskCategory,
    estimatedTime: dbTask.estimated_time,
    actualTime: dbTask.actual_time || undefined,
    status: dbTask.status as TaskStatus,
    completedAt: dbTask.completed_at ? new Date(dbTask.completed_at) : undefined,
    scheduledDate: dbTask.scheduled_date ? new Date(dbTask.scheduled_date) : undefined,
    scheduledTime: dbTask.scheduled_time || undefined,
    duration: dbTask.duration || undefined,
    createdAt: new Date(dbTask.created_at!),
    updatedAt: new Date(dbTask.updated_at!)
  }
}

export function taskToDbTaskInsert(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, userId: string): DbTaskInsert {
  return {
    user_id: userId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    urgency: task.urgency,
    category: task.category,
    estimated_time: task.estimatedTime,
    actual_time: task.actualTime,
    status: task.status,
    completed_at: task.completedAt?.toISOString(),
    scheduled_date: task.scheduledDate?.toISOString().split('T')[0],
    scheduled_time: task.scheduledTime,
    duration: task.duration
  }
}

export function taskToDbTaskUpdate(task: Partial<Task>): DbTaskUpdate {
  const update: DbTaskUpdate = {}
  
  if (task.title !== undefined) update.title = task.title
  if (task.description !== undefined) update.description = task.description
  if (task.priority !== undefined) update.priority = task.priority
  if (task.urgency !== undefined) update.urgency = task.urgency
  if (task.category !== undefined) update.category = task.category
  if (task.estimatedTime !== undefined) update.estimated_time = task.estimatedTime
  if (task.actualTime !== undefined) update.actual_time = task.actualTime
  if (task.status !== undefined) update.status = task.status
  if (task.completedAt !== undefined) update.completed_at = task.completedAt?.toISOString()
  if (task.scheduledDate !== undefined) update.scheduled_date = task.scheduledDate?.toISOString().split('T')[0]
  if (task.scheduledTime !== undefined) update.scheduled_time = task.scheduledTime
  if (task.duration !== undefined) update.duration = task.duration
  
  return update
}

export function dbTimeSlotToTimeSlot(dbTimeSlot: DbTimeSlot): TimeSlot {
  return {
    id: dbTimeSlot.id,
    taskId: dbTimeSlot.task_id || undefined,
    date: new Date(dbTimeSlot.date),
    startTime: dbTimeSlot.start_time,
    endTime: dbTimeSlot.end_time,
    type: dbTimeSlot.type as 'task' | 'event'
  }
}

export function timeSlotToDbTimeSlotInsert(timeSlot: Omit<TimeSlot, 'id'>, userId: string): DbTimeSlotInsert {
  return {
    user_id: userId,
    task_id: timeSlot.taskId,
    date: timeSlot.date.toISOString().split('T')[0],
    start_time: timeSlot.startTime,
    end_time: timeSlot.endTime,
    type: timeSlot.type
  }
}

// Task CRUD operations
export class TaskService {
  // Get all tasks for the current user
  static async getTasks(userId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks:', error)
      throw error
    }

    return data.map(dbTaskToTask)
  }

  // Create a new task
  static async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Task> {
    const dbTask = taskToDbTaskInsert(task, userId)
    
    const { data, error } = await supabase
      .from('tasks')
      .insert(dbTask)
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error)
      throw error
    }

    return dbTaskToTask(data)
  }

  // Update a task
  static async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const dbUpdates = taskToDbTaskUpdate(updates)
    
    const { data, error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('Error updating task:', error)
      throw error
    }

    return dbTaskToTask(data)
  }

  // Delete a task
  static async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('Error deleting task:', error)
      throw error
    }
  }

  // Get time slots for the current user
  static async getTimeSlots(userId: string): Promise<TimeSlot[]> {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching time slots:', error)
      throw error
    }

    return data.map(dbTimeSlotToTimeSlot)
  }

  // Create a new time slot
  static async createTimeSlot(timeSlot: Omit<TimeSlot, 'id'>, userId: string): Promise<TimeSlot> {
    const dbTimeSlot = timeSlotToDbTimeSlotInsert(timeSlot, userId)
    
    const { data, error } = await supabase
      .from('time_slots')
      .insert(dbTimeSlot)
      .select()
      .single()

    if (error) {
      console.error('Error creating time slot:', error)
      throw error
    }

    return dbTimeSlotToTimeSlot(data)
  }

  // Delete a time slot
  static async deleteTimeSlot(timeSlotId: string): Promise<void> {
    const { error } = await supabase
      .from('time_slots')
      .delete()
      .eq('id', timeSlotId)

    if (error) {
      console.error('Error deleting time slot:', error)
      throw error
    }
  }

  // Subscribe to real-time changes
  static subscribeToTasks(userId: string, callback: (tasks: Task[]) => void) {
    const channelName = `tasks_channel_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('Creating tasks channel:', channelName)
    
    // デバウンス用のタイマー
    let debounceTimer: NodeJS.Timeout | null = null
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('Tasks real-time update triggered:', payload.eventType, (payload.new as any)?.id)
          
          // デバウンス処理：短時間内の複数更新をまとめる
          if (debounceTimer) {
            clearTimeout(debounceTimer)
          }
          
          debounceTimer = setTimeout(async () => {
            try {
              const tasks = await TaskService.getTasks(userId)
              console.log('Refetched tasks count:', tasks.length)
              callback(tasks)
            } catch (error) {
              console.error('Error refetching tasks:', error)
            }
          }, 100) // 100ms デバウンス
        }
      )
      .subscribe()

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      supabase.removeChannel(channel)
    }
  }

  static subscribeToTimeSlots(userId: string, callback: (timeSlots: TimeSlot[]) => void) {
    const channelName = `time_slots_channel_${userId}_${Date.now()}`
    console.log('Creating time slots channel:', channelName)
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_slots',
          filter: `user_id=eq.${userId}`
        },
        async () => {
          // Refetch all time slots when any change occurs
          try {
            const timeSlots = await TaskService.getTimeSlots(userId)
            callback(timeSlots)
          } catch (error) {
            console.error('Error refetching time slots:', error)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}