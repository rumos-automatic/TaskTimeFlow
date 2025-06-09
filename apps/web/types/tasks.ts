export interface Task {
  id: string
  project_id: string
  assignee_id?: string
  created_by_id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  estimated_duration?: number // in minutes
  actual_duration?: number // in minutes
  start_time?: string
  end_time?: string
  labels: string[]
  context?: TaskContext
  energy_level?: EnergyLevel
  ai_generated: boolean
  ai_suggestions: AISuggestions
  position: number
  pomodoro_sessions: PomodoroSession[]
  created_at: string
  updated_at: string
  completed_at?: string
  
  // Populated fields
  assignee?: User
  created_by?: User
  project?: Project
}

export interface Project {
  id: string
  organization_id: string
  owner_id: string
  name: string
  description?: string
  color: string
  status: ProjectStatus
  kanban_columns: KanbanColumn[]
  settings: ProjectSettings
  created_at: string
  updated_at: string
  
  // Populated fields
  owner?: User
  organization?: Organization
  tasks?: Task[]
  members?: ProjectMember[]
}

export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  avatar_url?: string
  owner_id: string
  subscription_tier: SubscriptionTier
  max_members: number
  settings: OrganizationSettings
  created_at: string
  updated_at: string
  
  // Populated fields
  owner?: User
  members?: OrganizationMember[]
  projects?: Project[]
}

export interface User {
  id: string
  email: string
  display_name?: string
  avatar_url?: string
  timezone: string
  language: string
  subscription_tier: SubscriptionTier
  subscription_status: SubscriptionStatus
  created_at: string
  updated_at: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled'
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low'
export type TaskContext = 'pc_required' | 'anywhere' | 'home_only' | 'office_only' | 'phone_only'
export type EnergyLevel = 'high' | 'medium' | 'low'
export type ProjectStatus = 'active' | 'inactive' | 'archived'
export type SubscriptionTier = 'free' | 'personal' | 'pro' | 'team' | 'business' | 'enterprise'
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trial'

export interface KanbanColumn {
  id: string
  name: string
  icon: string
  order: number
  color?: string
  description?: string
  task_limit?: number
}

export interface ProjectSettings {
  auto_assign?: boolean
  default_priority?: TaskPriority
  default_energy_level?: EnergyLevel
  enable_time_tracking?: boolean
  enable_ai_suggestions?: boolean
  notification_settings?: {
    task_created?: boolean
    task_completed?: boolean
    task_overdue?: boolean
  }
}

export interface OrganizationSettings {
  allow_external_sharing?: boolean
  require_task_approval?: boolean
  default_project_visibility?: 'public' | 'private'
  time_zone?: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: UserRole
  permissions: MemberPermissions
  joined_at: string
  
  // Populated fields
  user?: User
}

export interface ProjectMember {
  user_id: string
  project_id: string
  role: ProjectRole
  permissions: ProjectPermissions
  
  // Populated fields
  user?: User
}

export type UserRole = 'owner' | 'admin' | 'member' | 'guest'
export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface MemberPermissions {
  can_create_projects?: boolean
  can_delete_projects?: boolean
  can_manage_members?: boolean
  can_view_analytics?: boolean
  can_manage_billing?: boolean
}

export interface ProjectPermissions {
  can_create_tasks?: boolean
  can_edit_tasks?: boolean
  can_delete_tasks?: boolean
  can_assign_tasks?: boolean
  can_view_private_tasks?: boolean
}

export interface AISuggestions {
  task_breakdown?: TaskBreakdown[]
  time_estimation?: TimeEstimation
  priority_suggestion?: TaskPriority
  energy_level_suggestion?: EnergyLevel
  scheduling_suggestions?: SchedulingSuggestion[]
  similar_tasks?: SimilarTask[]
}

export interface TaskBreakdown {
  id: string
  title: string
  description: string
  estimated_duration: number
  priority: TaskPriority
  order: number
}

export interface TimeEstimation {
  estimated_minutes: number
  confidence: number // 0-100
  factors: string[]
  similar_tasks_data?: {
    count: number
    avg_duration: number
    variance: number
  }
}

export interface SchedulingSuggestion {
  suggested_start: string
  suggested_end: string
  reason: string
  energy_alignment: boolean
  calendar_conflicts: CalendarConflict[]
}

export interface CalendarConflict {
  start: string
  end: string
  title: string
  type: 'meeting' | 'event' | 'block' | 'task'
}

export interface SimilarTask {
  id: string
  title: string
  description?: string
  actual_duration?: number
  similarity_score: number // 0-100
}

export interface PomodoroSession {
  id: string
  start_time: string
  end_time?: string
  duration: number // planned duration in minutes
  actual_duration?: number // actual duration in minutes
  completed: boolean
  break_duration?: number
  notes?: string
}

export interface TaskFilter {
  status?: TaskStatus[]
  priority?: TaskPriority[]
  assignee?: string[]
  labels?: string[]
  due_date?: {
    from?: string
    to?: string
  }
  energy_level?: EnergyLevel[]
  search?: string
  context?: TaskContext[]
  project_id?: string
  has_due_date?: boolean
  is_overdue?: boolean
  created_by?: string[]
  estimated_duration?: {
    min?: number
    max?: number
  }
}

export interface TaskSort {
  field: 'title' | 'priority' | 'due_date' | 'created_at' | 'updated_at' | 'estimated_duration'
  direction: 'asc' | 'desc'
}

export interface CreateTaskInput {
  title: string
  description?: string
  project_id: string
  assignee_id?: string
  priority?: TaskPriority
  estimated_duration?: number
  start_time?: string
  end_time?: string
  labels?: string[]
  context?: TaskContext
  energy_level?: EnergyLevel
  status?: TaskStatus
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  assignee_id?: string
  priority?: TaskPriority
  estimated_duration?: number
  actual_duration?: number
  start_time?: string
  end_time?: string
  labels?: string[]
  context?: TaskContext
  energy_level?: EnergyLevel
  status?: TaskStatus
  position?: number
  completed_at?: string
}

export interface CreateProjectInput {
  name: string
  description?: string
  color?: string
  organization_id: string
  kanban_columns?: KanbanColumn[]
  settings?: ProjectSettings
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  color?: string
  status?: ProjectStatus
  kanban_columns?: KanbanColumn[]
  settings?: ProjectSettings
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  
  // Populated fields
  user?: User
}

export interface TaskAttachment {
  id: string
  task_id: string
  user_id: string
  filename: string
  file_url: string
  file_size: number
  mime_type: string
  created_at: string
  
  // Populated fields
  user?: User
}

export interface TaskActivity {
  id: string
  task_id: string
  user_id: string
  action: TaskAction
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  description: string
  created_at: string
  
  // Populated fields
  user?: User
}

export type TaskAction = 
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'commented'
  | 'attachment_added'
  | 'attachment_removed'
  | 'label_added'
  | 'label_removed'
  | 'due_date_set'
  | 'due_date_changed'
  | 'due_date_removed'
  | 'priority_changed'
  | 'completed'
  | 'reopened'
  | 'archived'
  | 'deleted'

export interface DragDropResult {
  draggableId: string
  type: string
  source: {
    droppableId: string
    index: number
  }
  destination?: {
    droppableId: string
    index: number
  }
  reason: 'DROP' | 'CANCEL'
}

export interface KanbanBoard {
  id: string
  project: Project
  columns: KanbanBoardColumn[]
  settings: KanbanBoardSettings
}

export interface KanbanBoardColumn {
  id: string
  column: KanbanColumn
  tasks: Task[]
  isLoading?: boolean
  error?: string
}

export interface KanbanBoardSettings {
  show_assignee_avatars?: boolean
  show_priority_indicators?: boolean
  show_due_dates?: boolean
  show_estimated_time?: boolean
  show_labels?: boolean
  compact_view?: boolean
  auto_refresh?: boolean
  enable_real_time?: boolean
}

export interface TaskStatistics {
  total: number
  completed: number
  in_progress: number
  todo: number
  review: number
  cancelled: number
  overdue: number
  completion_rate: number
  avg_completion_time?: number
  total_estimated_time: number
  total_actual_time: number
}

export interface ProjectStatistics {
  task_stats: TaskStatistics
  member_count: number
  active_members: number
  recent_activity: TaskActivity[]
  progress_percentage: number
  burndown_data?: BurndownDataPoint[]
}

export interface BurndownDataPoint {
  date: string
  planned_tasks: number
  completed_tasks: number
  remaining_tasks: number
}

export interface TaskTemplate {
  id: string
  name: string
  description: string
  title_template: string
  description_template: string
  default_priority: TaskPriority
  default_energy_level: EnergyLevel
  default_estimated_duration: number
  default_labels: string[]
  subtasks: TaskTemplateSubtask[]
  variables: TaskTemplateVariable[]
  created_by: string
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export interface TaskTemplateSubtask {
  title: string
  description?: string
  estimated_duration: number
  priority: TaskPriority
  order: number
}

export interface TaskTemplateVariable {
  name: string
  type: 'text' | 'number' | 'date' | 'select'
  options?: string[]
  required: boolean
  default_value?: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  action_url?: string
  created_at: string
}

export type NotificationType = 
  | 'task_assigned'
  | 'task_completed'
  | 'task_overdue'
  | 'task_due_soon'
  | 'comment_added'
  | 'project_invitation'
  | 'organization_invitation'
  | 'subscription_expiring'
  | 'system_announcement'