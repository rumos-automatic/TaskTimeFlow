import { supabase } from './client'
import { Database } from '@/lib/database.types'
import { Task, TimeSlot, Priority, Urgency, TaskStatus, TaskCategory } from '@/lib/types'

// 日付ずれを防ぐためのヘルパー関数
function formatDateForDatabase(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateFromDatabase(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day) // ローカル時間で作成
}

type DbTask = Database['public']['Tables']['tasks']['Row']
type DbTaskInsert = Database['public']['Tables']['tasks']['Insert']
type DbTaskUpdate = Database['public']['Tables']['tasks']['Update']

type DbTimeSlot = Database['public']['Tables']['time_slots']['Row']
type DbTimeSlotInsert = Database['public']['Tables']['time_slots']['Insert']
type DbTimeSlotUpdate = Database['public']['Tables']['time_slots']['Update']

type DbTaskTimeLog = Database['public']['Tables']['task_time_logs']['Row']
type DbTaskTimeLogInsert = Database['public']['Tables']['task_time_logs']['Insert']
type DbTaskTimeLogUpdate = Database['public']['Tables']['task_time_logs']['Update']

type DbBreakTimeLog = Database['public']['Tables']['break_time_logs']['Row']
type DbBreakTimeLogInsert = Database['public']['Tables']['break_time_logs']['Insert']
type DbBreakTimeLogUpdate = Database['public']['Tables']['break_time_logs']['Update']

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
    scheduledDate: dbTask.scheduled_date ? parseDateFromDatabase(dbTask.scheduled_date) : undefined,
    scheduledTime: dbTask.scheduled_time || undefined,
    duration: dbTask.duration || undefined,
    notes: dbTask.notes || undefined,
    dueDate: dbTask.due_date ? parseDateFromDatabase(dbTask.due_date) : undefined,
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
    scheduled_date: task.scheduledDate ? formatDateForDatabase(task.scheduledDate) : null,
    scheduled_time: task.scheduledTime,
    duration: task.duration,
    notes: task.notes || null,
    due_date: task.dueDate ? formatDateForDatabase(task.dueDate) : null
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
  if (task.scheduledDate !== undefined) update.scheduled_date = task.scheduledDate ? formatDateForDatabase(task.scheduledDate) : null
  if (task.scheduledTime !== undefined) update.scheduled_time = task.scheduledTime
  if (task.duration !== undefined) update.duration = task.duration
  if (task.notes !== undefined) update.notes = task.notes
  if (task.dueDate !== undefined) update.due_date = task.dueDate ? formatDateForDatabase(task.dueDate) : null
  
  return update
}

export function dbTimeSlotToTimeSlot(dbTimeSlot: DbTimeSlot): TimeSlot {
  return {
    id: dbTimeSlot.id,
    taskId: dbTimeSlot.task_id || undefined,
    date: parseDateFromDatabase(dbTimeSlot.date),
    startTime: dbTimeSlot.start_time,
    endTime: dbTimeSlot.end_time,
    type: dbTimeSlot.type as 'task' | 'event'
  }
}

export function timeSlotToDbTimeSlotInsert(timeSlot: Omit<TimeSlot, 'id'>, userId: string): DbTimeSlotInsert {
  return {
    user_id: userId,
    task_id: timeSlot.taskId,
    date: formatDateForDatabase(timeSlot.date),
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
          }, 50) // 50ms デバウンス（反応性向上）
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
    const channelName = `time_slots_channel_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('🕒 Creating time slots channel:', channelName)
    
    // デバウンス用のタイマー
    let debounceTimer: NodeJS.Timeout | null = null
    
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
        async (payload) => {
          console.log('🕒 Time slots real-time update triggered:', payload.eventType, (payload.new as any)?.id)
          
          // デバウンス処理：短時間内の複数更新をまとめる
          if (debounceTimer) {
            clearTimeout(debounceTimer)
          }
          
          debounceTimer = setTimeout(async () => {
            try {
              const timeSlots = await TaskService.getTimeSlots(userId)
              console.log('🕒 Refetched time slots count:', timeSlots.length)
              callback(timeSlots)
            } catch (error) {
              console.error('Error refetching time slots:', error)
            }
          }, 50) // 50ms デバウンス（反応性向上）
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
  
  // Task Time Log operations for Stopwatch feature
  static async getTaskTimeLogs(userId: string, date?: Date): Promise<DbTaskTimeLog[]> {
    let query = supabase
      .from('task_time_logs')
      .select('*')
      .eq('user_id', userId)
      
    if (date) {
      const dateStr = formatDateForDatabase(date)
      query = query.eq('date', dateStr)
    }
    
    const { data, error } = await query.order('date', { ascending: false })
    
    if (error) {
      console.error('Error fetching task time logs:', error)
      throw error
    }
    
    return data || []
  }
  
  static async getDailyTimeLog(userId: string, date: Date): Promise<number> {
    const dateStr = formatDateForDatabase(date)
    
    const { data, error } = await supabase
      .from('task_time_logs')
      .select('duration')
      .eq('user_id', userId)
      .eq('date', dateStr)
      
    if (error) {
      console.error('Error fetching daily time log:', error)
      throw error
    }
    
    const total = (data || []).reduce((total: number, log: any) => total + (log.duration || 0), 0)
    return total
  }
  
  static async getTaskTimeLog(userId: string, taskId: string): Promise<number> {
    const { data, error } = await supabase
      .from('task_time_logs')
      .select('duration')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      
    if (error) {
      console.error('Error fetching task time log:', error)
      throw error
    }
    
    return (data || []).reduce((total, log) => total + (log.duration || 0), 0)
  }
  
  static async updateTimeLog(userId: string, taskId: string | null, duration: number, date?: Date): Promise<void> {
    const targetDate = date || new Date()
    const dateStr = formatDateForDatabase(targetDate)
    console.log(`updateTimeLog called: userId=${userId}, taskId=${taskId}, duration=${duration}, date=${dateStr}`)
    
    try {
      // Build query conditionally based on whether taskId is null
      let query = supabase
        .from('task_time_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', dateStr)
      
      if (taskId === null) {
        query = query.is('task_id', null)
      } else {
        query = query.eq('task_id', taskId)
      }
      
      // Use maybeSingle() instead of single() to handle multiple records gracefully
      const { data: existingLog, error: selectError } = await query.limit(1).maybeSingle()
      
      if (selectError) {
        console.error('Error selecting time log:', selectError)
        throw selectError
      }
        
      if (existingLog) {
        // Update existing log - add to duration
        const newDuration = (existingLog.duration || 0) + duration
        console.log(`Updating existing log ${existingLog.id}: ${existingLog.duration || 0} + ${duration} = ${newDuration}`)
        
        const { error } = await supabase
          .from('task_time_logs')
          .update({ 
            duration: newDuration,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLog.id)
          
        if (error) {
          console.error('Error updating time log:', error)
          throw error
        }
        console.log('Time log updated successfully')
      } else {
        // Create new log
        console.log(`Creating new time log with duration: ${duration}`)
        const { error } = await supabase
          .from('task_time_logs')
          .insert({
            user_id: userId,
            task_id: taskId,
            date: dateStr,
            duration: duration
          })
          
        if (error) {
          console.error('Error creating time log:', error)
          throw error
        }
        console.log('Time log created successfully')
      }
    } catch (error) {
      console.error('Error in updateTimeLog:', error)
      throw error
    }
  }
  
  static subscribeToTaskTimeLogs(userId: string, callback: () => void) {
    const channelName = `task_time_logs_channel_${userId}_${Date.now()}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_time_logs',
          filter: `user_id=eq.${userId}`
        },
        () => {
          callback()
        }
      )
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }
  
  // Break Time Log operations
  static async getBreakTimeLogs(userId: string, date?: Date): Promise<DbBreakTimeLog[]> {
    let query = supabase
      .from('break_time_logs')
      .select('*')
      .eq('user_id', userId)
      
    if (date) {
      const dateStr = formatDateForDatabase(date)
      query = query.eq('date', dateStr)
    }
    
    const { data, error } = await query.order('date', { ascending: false })
    
    if (error) {
      console.error('Error fetching break time logs:', error)
      // break_time_logsテーブルが存在しない場合は空配列を返す
      return []
    }
    
    return data || []
  }
  
  static async getDailyBreakTime(userId: string, date: Date): Promise<number> {
    const dateStr = formatDateForDatabase(date)
    console.log(`getDailyBreakTime called: userId=${userId}, date=${dateStr}`)
    
    try {
      const { data, error } = await supabase
        .from('break_time_logs')
        .select('duration')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .single()
        
      if (error) {
        // レコードが存在しない場合
        if (error.code === 'PGRST116') {
          console.log(`No break time log found for ${dateStr}, returning 0`)
          return 0
        }
        console.error('Error fetching daily break time:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        // テーブルが存在しない場合は0を返す
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('break_time_logs table does not exist, returning 0')
          return 0
        }
        throw error
      }
      
      console.log('Break time log fetched:', data)
      const total = data?.duration || 0
      console.log(`Total break time for ${dateStr}: ${total} seconds`)
      return total
    } catch (error) {
      console.error('Unexpected error in getDailyBreakTime:', error)
      return 0
    }
  }
  
  static async updateBreakTime(userId: string, duration: number, date?: Date): Promise<void> {
    const targetDate = date || new Date()
    const dateStr = formatDateForDatabase(targetDate)
    console.log(`updateBreakTime called: userId=${userId}, duration=${duration}, date=${dateStr}`)
    
    try {
      // Check if a log already exists for this date
      const { data: existingLogs, error: selectError } = await supabase
        .from('break_time_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .order('created_at', { ascending: true })
        .limit(1)
      
      if (selectError) {
        console.error('Error checking existing break time log:', selectError)
        // テーブルが存在しない場合はスキップ
        if (selectError.code === '42P01' || selectError.message?.includes('relation') || selectError.message?.includes('does not exist')) {
          console.warn('break_time_logs table does not exist, skipping update')
          return
        }
        throw selectError
      }
      
      const existingLog = existingLogs && existingLogs.length > 0 ? existingLogs[0] : null
        
      if (existingLog) {
        // Update existing log - add to duration
        const newDuration = (existingLog.duration || 0) + duration
        console.log(`Updating existing break log ${existingLog.id}: ${existingLog.duration || 0} + ${duration} = ${newDuration}`)
        
        const { error } = await supabase
          .from('break_time_logs')
          .update({ 
            duration: newDuration,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLog.id)
          
        if (error) {
          console.error('Error updating break time log:', error)
          throw error
        }
        console.log('Break time log updated successfully')
      } else {
        // Create new log
        console.log(`Creating new break time log with duration: ${duration}`)
        const { error } = await supabase
          .from('break_time_logs')
          .insert({
            user_id: userId,
            date: dateStr,
            duration: duration
          })
          
        if (error) {
          console.error('Error creating break time log:', error)
          throw error
        }
        console.log('Break time log created successfully')
      }
    } catch (error) {
      console.error('Unexpected error in updateBreakTime:', error)
      // エラーが発生しても処理を継続
    }
  }
  
  static subscribeToBreakTimeLogs(userId: string, callback: () => void) {
    const channelName = `break_time_logs_channel_${userId}_${Date.now()}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'break_time_logs',
          filter: `user_id=eq.${userId}`
        },
        () => {
          callback()
        }
      )
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }
  
  // Get monthly time logs (work time and break time) for calendar view
  static async getMonthlyTimeLogs(userId: string, year: number, month: number): Promise<{ date: Date, workTime: number, breakTime: number }[]> {
    const { data, error } = await supabase
      .rpc('get_monthly_time_logs', {
        p_user_id: userId,
        p_year: year,
        p_month: month
      })
      
    if (error) {
      console.error('Error fetching monthly time logs:', error)
      throw error
    }
    
    return (data || []).map((log: any) => ({
      date: parseDateFromDatabase(log.date),
      workTime: log.work_time || 0,
      breakTime: log.break_time || 0
    }))
  }
}