export interface TimelineSlot {
  id: string
  user_id: string
  task_id: string
  start_time: string
  end_time: string
  date: string
  status: TimelineStatus
  actual_start_time?: string
  actual_end_time?: string
  google_calendar_event_id?: string
  synced_at?: string
  created_at: string
  updated_at: string
  
  // Populated fields
  task?: Task
}

export interface TimeBlock {
  id: string
  user_id: string
  start_hour: number
  end_hour: number
  label: string
  color: string
  energy_level: EnergyLevel
  days_of_week: number[] // 0=Sunday, 6=Saturday
  description?: string
  is_work_time: boolean
  is_break_time: boolean
  created_at: string
  updated_at: string
}

export type TimelineStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type EnergyLevel = 'high' | 'medium' | 'low'

export interface TimelineView {
  date: Date
  time_blocks: TimeBlock[]
  timeline_slots: TimelineSlot[]
  unscheduled_tasks: Task[]
  settings: TimelineSettings
}

export interface TimelineSettings {
  time_format: '12' | '24'
  week_start: number // 0=Sunday, 1=Monday
  default_task_duration: number // minutes
  auto_schedule: boolean
  show_energy_levels: boolean
  show_time_blocks: boolean
  show_completed_tasks: boolean
  compact_view: boolean
  snap_to_grid: boolean
  grid_interval: number // minutes (15, 30, 60)
  working_hours: {
    start: number // hour (0-23)
    end: number // hour (0-23)
  }
  break_duration: number // minutes
  focus_session_duration: number // minutes (pomodoro)
}

export interface TimelineHour {
  hour: number
  display: string
  time_blocks: TimeBlockSegment[]
  timeline_slots: TimelineSlot[]
  is_working_hour: boolean
  energy_level?: EnergyLevel
  gradient_class: string
}

export interface TimeBlockSegment {
  time_block: TimeBlock
  start_minute: number // 0-59
  end_minute: number // 0-59
  duration: number // minutes
}

export interface TimelinePosition {
  hour: number
  minute: number
  pixel_offset: number
}

export interface DragTimelineItem {
  type: 'task' | 'timeline_slot' | 'time_block'
  item: Task | TimelineSlot | TimeBlock
  original_position?: TimelinePosition
}

export interface TimelineDropResult {
  item: DragTimelineItem
  new_position: TimelinePosition
  target_date: Date
}

export interface CreateTimelineSlotInput {
  task_id: string
  start_time: string
  end_time: string
  date: string
}

export interface UpdateTimelineSlotInput {
  start_time?: string
  end_time?: string
  status?: TimelineStatus
  actual_start_time?: string
  actual_end_time?: string
}

export interface CreateTimeBlockInput {
  start_hour: number
  end_hour: number
  label: string
  color: string
  energy_level: EnergyLevel
  days_of_week: number[]
  description?: string
  is_work_time: boolean
  is_break_time: boolean
}

export interface UpdateTimeBlockInput {
  start_hour?: number
  end_hour?: number
  label?: string
  color?: string
  energy_level?: EnergyLevel
  days_of_week?: number[]
  description?: string
  is_work_time?: boolean
  is_break_time?: boolean
}

export interface TimelineConflict {
  type: 'overlap' | 'double_booking' | 'energy_mismatch' | 'break_violation'
  description: string
  start_time: string
  end_time: string
  conflicting_items: (TimelineSlot | TimeBlock)[]
  severity: 'warning' | 'error'
  suggested_resolution?: string
}

export interface SchedulingSuggestion {
  task: Task
  suggested_slots: SuggestedTimeSlot[]
  reasoning: string
  confidence: number // 0-100
  factors: SchedulingFactor[]
}

export interface SuggestedTimeSlot {
  start_time: string
  end_time: string
  score: number // 0-100
  reasons: string[]
  conflicts: TimelineConflict[]
}

export interface SchedulingFactor {
  name: string
  weight: number
  description: string
  current_value: number
}

export interface TimelineAnalytics {
  date: string
  total_scheduled_time: number // minutes
  total_actual_time: number // minutes
  focus_time: number // minutes
  break_time: number // minutes
  energy_distribution: {
    high: number
    medium: number
    low: number
  }
  completion_rate: number // percentage
  efficiency_score: number // percentage
  peak_productivity_hours: number[]
  time_waste: number // minutes
  context_switches: number
}

export interface TimelineFilter {
  show_completed?: boolean
  show_cancelled?: boolean
  task_priorities?: TaskPriority[]
  energy_levels?: EnergyLevel[]
  contexts?: TaskContext[]
  project_ids?: string[]
  assignee_ids?: string[]
  labels?: string[]
}

export interface AutoScheduleRequest {
  tasks: Task[]
  date: Date
  constraints: SchedulingConstraints
  preferences: SchedulingPreferences
}

export interface SchedulingConstraints {
  working_hours: {
    start: number
    end: number
  }
  break_duration: number
  focus_session_duration: number
  buffer_time: number // minutes between tasks
  respect_energy_levels: boolean
  respect_contexts: boolean
  existing_slots: TimelineSlot[]
  unavailable_times: TimeSlotRange[]
}

export interface SchedulingPreferences {
  prefer_morning: boolean
  prefer_afternoon: boolean
  prefer_evening: boolean
  group_similar_tasks: boolean
  respect_task_order: boolean
  minimize_context_switches: boolean
  batch_meetings: boolean
  protect_deep_work: boolean
}

export interface TimeSlotRange {
  start_time: string
  end_time: string
  reason?: string
}

export interface TimelineNotification {
  id: string
  type: TimelineNotificationType
  title: string
  message: string
  scheduled_time: string
  triggered: boolean
  dismissed: boolean
  created_at: string
}

export type TimelineNotificationType = 
  | 'task_starting'
  | 'task_ending'
  | 'break_reminder'
  | 'focus_session_complete'
  | 'schedule_conflict'
  | 'overdue_task'
  | 'daily_summary'

export interface PomodoroSession {
  id: string
  task_id?: string
  start_time: string
  end_time?: string
  duration: number // planned duration in minutes
  actual_duration?: number // actual duration in minutes
  type: 'focus' | 'short_break' | 'long_break'
  completed: boolean
  notes?: string
  interruptions: number
  created_at: string
}

export interface FocusSession {
  id: string
  user_id: string
  start_time: string
  end_time?: string
  planned_duration: number // minutes
  actual_duration?: number // minutes
  task_ids: string[]
  session_type: 'deep_work' | 'pomodoro' | 'time_block' | 'custom'
  completed: boolean
  quality_rating?: number // 1-5
  notes?: string
  interruptions: Interruption[]
  created_at: string
}

export interface Interruption {
  id: string
  timestamp: string
  type: 'external' | 'internal' | 'notification' | 'emergency'
  description?: string
  duration?: number // seconds
  handled: boolean
}

export interface TimelineTemplate {
  id: string
  name: string
  description: string
  time_blocks: Omit<TimeBlock, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]
  is_public: boolean
  created_by: string
  usage_count: number
  rating: number
  tags: string[]
  created_at: string
  updated_at: string
}

export interface DailySchedule {
  date: string
  user_id: string
  time_blocks: TimeBlock[]
  timeline_slots: TimelineSlot[]
  focus_sessions: FocusSession[]
  analytics: TimelineAnalytics
  template_id?: string
  generated_at: string
  is_optimized: boolean
}

export interface WeeklyPattern {
  user_id: string
  day_of_week: number // 0=Sunday, 6=Saturday
  typical_schedule: {
    time_blocks: TimeBlock[]
    common_task_types: string[]
    energy_pattern: EnergyLevel[]
    productive_hours: number[]
  }
  last_updated: string
}

export interface CalendarIntegration {
  id: string
  user_id: string
  provider: 'google_calendar' | 'outlook' | 'apple_calendar'
  calendar_id: string
  calendar_name: string
  sync_enabled: boolean
  last_sync: string
  sync_direction: 'import' | 'export' | 'bidirectional'
  filter_rules: CalendarFilterRule[]
  created_at: string
}

export interface CalendarFilterRule {
  field: 'title' | 'description' | 'attendees' | 'location'
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with'
  value: string
  action: 'include' | 'exclude' | 'transform'
  transformation?: string
}

export interface ExternalEvent {
  id: string
  calendar_integration_id: string
  external_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  attendees: string[]
  is_all_day: boolean
  status: 'confirmed' | 'tentative' | 'cancelled'
  created_at: string
  updated_at: string
}

// Import Task related types
import type { Task, TaskPriority, TaskContext } from './tasks'