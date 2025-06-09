import { supabase } from './supabase'
import type { 
  TimelineSlot,
  TimeBlock,
  CreateTimelineSlotInput,
  UpdateTimelineSlotInput,
  CreateTimeBlockInput,
  UpdateTimeBlockInput,
  TimelineView,
  TimelineHour,
  TimeBlockSegment,
  TimelinePosition,
  TimelineConflict,
  TimelineAnalytics,
  SchedulingSuggestion,
  AutoScheduleRequest,
  TimelineFilter
} from '@/types/timeline'
import type { Task } from '@/types/tasks'
import type { Database } from '@/types/supabase'

// Timeline Slot Management
export async function createTimelineSlot(input: CreateTimelineSlotInput): Promise<{ data: TimelineSlot | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: '認証が必要です' }
    }

    const slotData = {
      ...input,
      user_id: user.id,
      status: 'scheduled' as const
    }

    const { data, error } = await supabase
      .from('timeline_slots')
      .insert(slotData)
      .select(`
        *,
        task:tasks(*)
      `)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as TimelineSlot, error: null }
  } catch (err) {
    return { data: null, error: 'タイムラインスロットの作成に失敗しました' }
  }
}

export async function updateTimelineSlot(slotId: string, input: UpdateTimelineSlotInput): Promise<{ data: TimelineSlot | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('timeline_slots')
      .update(input)
      .eq('id', slotId)
      .select(`
        *,
        task:tasks(*)
      `)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as TimelineSlot, error: null }
  } catch (err) {
    return { data: null, error: 'タイムラインスロットの更新に失敗しました' }
  }
}

export async function deleteTimelineSlot(slotId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('timeline_slots')
      .delete()
      .eq('id', slotId)

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    return { error: 'タイムラインスロットの削除に失敗しました' }
  }
}

export async function getTimelineSlots(
  date: Date,
  userId?: string,
  filter?: TimelineFilter
): Promise<{ data: TimelineSlot[]; error: string | null }> {
  try {
    const dateString = date.toISOString().split('T')[0]
    
    let query = supabase
      .from('timeline_slots')
      .select(`
        *,
        task:tasks(*)
      `)
      .eq('date', dateString)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Apply filters
    if (filter) {
      if (filter.show_completed === false) {
        query = query.neq('status', 'completed')
      }
      if (filter.show_cancelled === false) {
        query = query.neq('status', 'cancelled')
      }
    }

    query = query.order('start_time', { ascending: true })

    const { data, error } = await query

    if (error) {
      return { data: [], error: error.message }
    }

    return { data: data as TimelineSlot[], error: null }
  } catch (err) {
    return { data: [], error: 'タイムラインスロットの取得に失敗しました' }
  }
}

// Time Block Management
export async function createTimeBlock(input: CreateTimeBlockInput): Promise<{ data: TimeBlock | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: '認証が必要です' }
    }

    const blockData = {
      ...input,
      user_id: user.id
    }

    const { data, error } = await supabase
      .from('time_blocks')
      .insert(blockData)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as TimeBlock, error: null }
  } catch (err) {
    return { data: null, error: 'タイムブロックの作成に失敗しました' }
  }
}

export async function updateTimeBlock(blockId: string, input: UpdateTimeBlockInput): Promise<{ data: TimeBlock | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('time_blocks')
      .update(input)
      .eq('id', blockId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as TimeBlock, error: null }
  } catch (err) {
    return { data: null, error: 'タイムブロックの更新に失敗しました' }
  }
}

export async function deleteTimeBlock(blockId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('time_blocks')
      .delete()
      .eq('id', blockId)

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    return { error: 'タイムブロックの削除に失敗しました' }
  }
}

export async function getTimeBlocks(
  userId: string,
  dayOfWeek?: number
): Promise<{ data: TimeBlock[]; error: string | null }> {
  try {
    let query = supabase
      .from('time_blocks')
      .select('*')
      .eq('user_id', userId)

    if (dayOfWeek !== undefined) {
      query = query.contains('days_of_week', [dayOfWeek])
    }

    query = query.order('start_hour', { ascending: true })

    const { data, error } = await query

    if (error) {
      return { data: [], error: error.message }
    }

    return { data: data as TimeBlock[], error: null }
  } catch (err) {
    return { data: [], error: 'タイムブロックの取得に失敗しました' }
  }
}

// Timeline View Construction
export async function getTimelineView(
  date: Date,
  userId: string,
  filter?: TimelineFilter
): Promise<{ data: TimelineView | null; error: string | null }> {
  try {
    const dayOfWeek = date.getDay()
    
    // Get time blocks for this day
    const { data: timeBlocks, error: timeBlocksError } = await getTimeBlocks(userId, dayOfWeek)
    if (timeBlocksError) {
      return { data: null, error: timeBlocksError }
    }

    // Get timeline slots for this date
    const { data: timelineSlots, error: slotsError } = await getTimelineSlots(date, userId, filter)
    if (slotsError) {
      return { data: null, error: slotsError }
    }

    // Get unscheduled tasks
    const { data: unscheduledTasks, error: tasksError } = await getUnscheduledTasks(userId, date)
    if (tasksError) {
      return { data: null, error: tasksError }
    }

    // Get user settings
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('timeline_settings')
      .eq('user_id', userId)
      .single()

    const settings = userSettings?.timeline_settings || getDefaultTimelineSettings()

    const timelineView: TimelineView = {
      date,
      time_blocks: timeBlocks,
      timeline_slots: timelineSlots,
      unscheduled_tasks: unscheduledTasks,
      settings
    }

    return { data: timelineView, error: null }
  } catch (err) {
    return { data: null, error: 'タイムライン表示の構築に失敗しました' }
  }
}

// Unscheduled Tasks
export async function getUnscheduledTasks(
  userId: string,
  date: Date
): Promise<{ data: Task[]; error: string | null }> {
  try {
    const dateString = date.toISOString().split('T')[0]
    
    // Get tasks that are not scheduled for this date
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assignee_id', userId)
      .in('status', ['todo', 'in_progress'])
      .not('id', 'in', 
        supabase
          .from('timeline_slots')
          .select('task_id')
          .eq('date', dateString)
      )

    if (error) {
      return { data: [], error: error.message }
    }

    return { data: tasks as Task[], error: null }
  } catch (err) {
    return { data: [], error: '未スケジュールタスクの取得に失敗しました' }
  }
}

// Timeline Hours Generation
export function generateTimelineHours(
  timeBlocks: TimeBlock[],
  timelineSlots: TimelineSlot[],
  settings: any
): TimelineHour[] {
  const hours: TimelineHour[] = []

  for (let hour = 0; hour < 24; hour++) {
    // Get time blocks for this hour
    const hourTimeBlocks = timeBlocks
      .filter(block => hour >= block.start_hour && hour < block.end_hour)
      .map(block => createTimeBlockSegment(block, hour))

    // Get timeline slots for this hour
    const hourSlots = timelineSlots.filter(slot => {
      const startHour = new Date(slot.start_time).getHours()
      const endHour = new Date(slot.end_time).getHours()
      return hour >= startHour && hour <= endHour
    })

    // Determine energy level for this hour
    const energyLevel = getHourEnergyLevel(hour, hourTimeBlocks)

    // Get gradient class for visual styling
    const gradientClass = getHourGradientClass(hour)

    hours.push({
      hour,
      display: formatHour(hour, settings.time_format),
      time_blocks: hourTimeBlocks,
      timeline_slots: hourSlots,
      is_working_hour: isWorkingHour(hour, settings),
      energy_level: energyLevel,
      gradient_class: gradientClass
    })
  }

  return hours
}

function createTimeBlockSegment(timeBlock: TimeBlock, hour: number): TimeBlockSegment {
  const startMinute = hour === timeBlock.start_hour ? 0 : 0
  const endMinute = hour === timeBlock.end_hour - 1 ? 0 : 59
  const duration = endMinute - startMinute + 1

  return {
    time_block: timeBlock,
    start_minute: startMinute,
    end_minute: endMinute,
    duration
  }
}

function getHourEnergyLevel(hour: number, timeBlocks: TimeBlockSegment[]): 'high' | 'medium' | 'low' | undefined {
  if (timeBlocks.length === 0) return undefined
  
  // Return the energy level of the longest time block in this hour
  const longestBlock = timeBlocks.reduce((prev, current) => 
    prev.duration > current.duration ? prev : current
  )
  
  return longestBlock.time_block.energy_level
}

function getHourGradientClass(hour: number): string {
  // Different gradient classes based on time of day
  if (hour >= 0 && hour < 6) return 'bg-gradient-to-b from-slate-900 to-slate-800' // Night
  if (hour >= 6 && hour < 8) return 'bg-gradient-to-b from-blue-200 to-blue-100' // Dawn
  if (hour >= 8 && hour < 12) return 'bg-gradient-to-b from-emerald-100 to-emerald-50' // Morning
  if (hour >= 12 && hour < 14) return 'bg-gradient-to-b from-yellow-100 to-yellow-50' // Lunch
  if (hour >= 14 && hour < 18) return 'bg-gradient-to-b from-purple-100 to-purple-50' // Afternoon
  if (hour >= 18 && hour < 22) return 'bg-gradient-to-b from-red-100 to-red-50' // Evening
  return 'bg-gradient-to-b from-indigo-200 to-indigo-100' // Late evening
}

function formatHour(hour: number, format: '12' | '24'): string {
  if (format === '12') {
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const ampm = hour < 12 ? 'AM' : 'PM'
    return `${displayHour}:00 ${ampm}`
  }
  return `${hour.toString().padStart(2, '0')}:00`
}

function isWorkingHour(hour: number, settings: any): boolean {
  const workingHours = settings.working_hours || { start: 9, end: 17 }
  return hour >= workingHours.start && hour < workingHours.end
}

// Position Calculations
export function calculateTimelinePosition(time: Date): TimelinePosition {
  const hour = time.getHours()
  const minute = time.getMinutes()
  const pixelOffset = (hour * 60 + minute) * (60 / 60) // 1 pixel per minute

  return {
    hour,
    minute,
    pixel_offset: pixelOffset
  }
}

export function positionToDateTime(position: TimelinePosition, date: Date): Date {
  const newDate = new Date(date)
  newDate.setHours(position.hour, position.minute, 0, 0)
  return newDate
}

export function pixelOffsetToTime(pixelOffset: number): { hour: number; minute: number } {
  const totalMinutes = pixelOffset // 1 pixel = 1 minute
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  
  return { hour: Math.min(hour, 23), minute: Math.min(minute, 59) }
}

// Conflict Detection
export function detectTimelineConflicts(
  timelineSlots: TimelineSlot[],
  newSlot: { start_time: string; end_time: string }
): TimelineConflict[] {
  const conflicts: TimelineConflict[] = []
  const newStart = new Date(newSlot.start_time)
  const newEnd = new Date(newSlot.end_time)

  for (const slot of timelineSlots) {
    const slotStart = new Date(slot.start_time)
    const slotEnd = new Date(slot.end_time)

    // Check for time overlap
    if (
      (newStart >= slotStart && newStart < slotEnd) ||
      (newEnd > slotStart && newEnd <= slotEnd) ||
      (newStart <= slotStart && newEnd >= slotEnd)
    ) {
      conflicts.push({
        type: 'overlap',
        description: `既存のタスク「${slot.task?.title}」と時間が重複しています`,
        start_time: Math.max(newStart.getTime(), slotStart.getTime()).toString(),
        end_time: Math.min(newEnd.getTime(), slotEnd.getTime()).toString(),
        conflicting_items: [slot],
        severity: 'error',
        suggested_resolution: '時間を調整するか、既存のタスクを移動してください'
      })
    }
  }

  return conflicts
}

// Auto-scheduling
export async function autoScheduleTasks(request: AutoScheduleRequest): Promise<{ data: TimelineSlot[] | null; error: string | null }> {
  try {
    // This is a simplified auto-scheduling algorithm
    // In a real implementation, this would use more sophisticated algorithms
    
    const { tasks, date, constraints, preferences } = request
    const scheduledSlots: TimelineSlot[] = []
    
    // Sort tasks by priority and energy level
    const sortedTasks = tasks.sort((a: Task, b: Task) => {
      const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 }
      const energyWeight = { high: 3, medium: 2, low: 1 }
      
      const aScore = (priorityWeight[a.priority] || 0) + (energyWeight[a.energy_level || 'medium'] || 0)
      const bScore = (priorityWeight[b.priority] || 0) + (energyWeight[b.energy_level || 'medium'] || 0)
      
      return bScore - aScore
    })

    let currentTime = new Date(date)
    currentTime.setHours(constraints.working_hours.start, 0, 0, 0)

    for (const task of sortedTasks) {
      const duration = task.estimated_duration || 60 // Default 1 hour
      const endTime = new Date(currentTime.getTime() + duration * 60000)

      // Check if it fits within working hours
      if (endTime.getHours() >= constraints.working_hours.end) {
        continue // Skip this task if it doesn't fit
      }

      const slotInput: CreateTimelineSlotInput = {
        task_id: task.id,
        start_time: currentTime.toISOString(),
        end_time: endTime.toISOString(),
        date: date.toISOString().split('T')[0]
      }

      const { data: slot, error } = await createTimelineSlot(slotInput)
      if (slot && !error) {
        scheduledSlots.push(slot)
        
        // Move to next time slot with buffer
        currentTime = new Date(endTime.getTime() + constraints.buffer_time * 60000)
      }
    }

    return { data: scheduledSlots, error: null }
  } catch (err) {
    return { data: null, error: '自動スケジュール作成に失敗しました' }
  }
}

// Analytics
export async function calculateTimelineAnalytics(
  userId: string,
  date: Date
): Promise<{ data: TimelineAnalytics | null; error: string | null }> {
  try {
    const dateString = date.toISOString().split('T')[0]
    
    // Get timeline slots for the date
    const { data: slots, error: slotsError } = await getTimelineSlots(date, userId)
    if (slotsError) {
      return { data: null, error: slotsError }
    }

    // Calculate various metrics
    const totalScheduledTime = slots.reduce((sum, slot) => {
      const start = new Date(slot.start_time)
      const end = new Date(slot.end_time)
      return sum + (end.getTime() - start.getTime()) / (1000 * 60)
    }, 0)

    const totalActualTime = slots.reduce((sum, slot) => {
      if (slot.actual_start_time && slot.actual_end_time) {
        const start = new Date(slot.actual_start_time)
        const end = new Date(slot.actual_end_time)
        return sum + (end.getTime() - start.getTime()) / (1000 * 60)
      }
      return sum
    }, 0)

    const completedSlots = slots.filter(slot => slot.status === 'completed')
    const completionRate = slots.length > 0 ? (completedSlots.length / slots.length) * 100 : 0

    const efficiencyScore = totalScheduledTime > 0 ? (totalActualTime / totalScheduledTime) * 100 : 100

    const analytics: TimelineAnalytics = {
      date: dateString,
      total_scheduled_time: totalScheduledTime,
      total_actual_time: totalActualTime,
      focus_time: totalActualTime, // Simplified
      break_time: 0, // Would need to calculate from time blocks
      energy_distribution: {
        high: 0,
        medium: 0,
        low: 0
      },
      completion_rate: completionRate,
      efficiency_score: efficiencyScore,
      peak_productivity_hours: [], // Would need more complex analysis
      time_waste: Math.max(0, totalScheduledTime - totalActualTime),
      context_switches: 0 // Would need to analyze task contexts
    }

    return { data: analytics, error: null }
  } catch (err) {
    return { data: null, error: 'タイムライン分析の計算に失敗しました' }
  }
}

// Utility Functions
export function getDefaultTimelineSettings() {
  return {
    time_format: '24' as const,
    week_start: 1, // Monday
    default_task_duration: 60,
    auto_schedule: false,
    show_energy_levels: true,
    show_time_blocks: true,
    show_completed_tasks: true,
    compact_view: false,
    snap_to_grid: true,
    grid_interval: 15,
    working_hours: {
      start: 9,
      end: 17
    },
    break_duration: 15,
    focus_session_duration: 25
  }
}

export function formatTimeRange(startTime: string, endTime: string): string {
  const start = new Date(startTime)
  const end = new Date(endTime)
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  return `${formatTime(start)} - ${formatTime(end)}`
}

export function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime)
  const end = new Date(endTime)
  return (end.getTime() - start.getTime()) / (1000 * 60) // minutes
}

export function snapToGrid(minute: number, gridInterval: number): number {
  return Math.round(minute / gridInterval) * gridInterval
}

export function isValidTimeSlot(startTime: string, endTime: string): boolean {
  const start = new Date(startTime)
  const end = new Date(endTime)
  return start < end && end.getTime() - start.getTime() >= 15 * 60 * 1000 // At least 15 minutes
}