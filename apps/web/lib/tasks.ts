import { supabase } from './supabase'
import type { 
  Task, 
  Project, 
  CreateTaskInput, 
  UpdateTaskInput, 
  CreateProjectInput, 
  UpdateProjectInput,
  TaskFilter,
  TaskSort,
  DragDropResult,
  TaskStatistics,
  ProjectStatistics
} from '@/types/tasks'
import type { Database } from '@/types/supabase'

// Task Management Functions
export async function createTask(input: CreateTaskInput): Promise<{ data: Task | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: '認証が必要です' }
    }

    // Get the highest position in the target status column
    const { data: maxPositionData } = await supabase
      .from('tasks')
      .select('position')
      .eq('project_id', input.project_id)
      .eq('status', input.status || 'todo')
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const newPosition = (maxPositionData?.position || 0) + 1

    const taskData = {
      ...input,
      created_by_id: user.id,
      assignee_id: input.assignee_id || user.id,
      priority: input.priority || 'medium',
      energy_level: input.energy_level || 'medium',
      status: input.status || 'todo',
      labels: input.labels || [],
      ai_generated: false,
      ai_suggestions: {},
      position: newPosition,
      pomodoro_sessions: []
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select(`
        *,
        assignee:users!assignee_id(*),
        created_by:users!created_by_id(*),
        project:projects(*)
      `)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as Task, error: null }
  } catch (err) {
    return { data: null, error: 'タスクの作成に失敗しました' }
  }
}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<{ data: Task | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(input)
      .eq('id', taskId)
      .select(`
        *,
        assignee:users!assignee_id(*),
        created_by:users!created_by_id(*),
        project:projects(*)
      `)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as Task, error: null }
  } catch (err) {
    return { data: null, error: 'タスクの更新に失敗しました' }
  }
}

export async function deleteTask(taskId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    return { error: 'タスクの削除に失敗しました' }
  }
}

export async function getTask(taskId: string): Promise<{ data: Task | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:users!assignee_id(*),
        created_by:users!created_by_id(*),
        project:projects(*)
      `)
      .eq('id', taskId)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as Task, error: null }
  } catch (err) {
    return { data: null, error: 'タスクの取得に失敗しました' }
  }
}

export async function getTasks(
  projectId?: string,
  filter?: TaskFilter,
  sort?: TaskSort
): Promise<{ data: Task[]; error: string | null }> {
  try {
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assignee:users!assignee_id(*),
        created_by:users!created_by_id(*),
        project:projects(*)
      `)

    // Apply project filter
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    // Apply filters
    if (filter) {
      if (filter.status) {
        query = query.in('status', filter.status)
      }
      if (filter.priority) {
        query = query.in('priority', filter.priority)
      }
      if (filter.assignee) {
        query = query.in('assignee_id', filter.assignee)
      }
      if (filter.energy_level) {
        query = query.in('energy_level', filter.energy_level)
      }
      if (filter.context) {
        query = query.in('context', filter.context)
      }
      if (filter.created_by) {
        query = query.in('created_by_id', filter.created_by)
      }
      if (filter.labels && filter.labels.length > 0) {
        query = query.overlaps('labels', filter.labels)
      }
      if (filter.search) {
        query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`)
      }
      if (filter.due_date) {
        if (filter.due_date.from) {
          query = query.gte('end_time', filter.due_date.from)
        }
        if (filter.due_date.to) {
          query = query.lte('end_time', filter.due_date.to)
        }
      }
      if (filter.estimated_duration) {
        if (filter.estimated_duration.min) {
          query = query.gte('estimated_duration', filter.estimated_duration.min)
        }
        if (filter.estimated_duration.max) {
          query = query.lte('estimated_duration', filter.estimated_duration.max)
        }
      }
      if (filter.has_due_date !== undefined) {
        if (filter.has_due_date) {
          query = query.not('end_time', 'is', null)
        } else {
          query = query.is('end_time', null)
        }
      }
      if (filter.is_overdue) {
        const now = new Date().toISOString()
        query = query.lt('end_time', now).neq('status', 'completed')
      }
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' })
    } else {
      query = query.order('position', { ascending: true })
    }

    const { data, error } = await query

    if (error) {
      return { data: [], error: error.message }
    }

    return { data: data as Task[], error: null }
  } catch (err) {
    return { data: [], error: 'タスクの取得に失敗しました' }
  }
}

// Project Management Functions
export async function createProject(input: CreateProjectInput): Promise<{ data: Project | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: '認証が必要です' }
    }

    const defaultColumns = [
      { id: 'todo', name: 'ToDo', icon: '📝', order: 0 },
      { id: 'in_progress', name: '進行中', icon: '🚀', order: 1 },
      { id: 'review', name: 'レビュー', icon: '👀', order: 2 },
      { id: 'completed', name: '完了', icon: '✅', order: 3 }
    ]

    const projectData = {
      ...input,
      owner_id: user.id,
      color: input.color || '#6366F1',
      status: 'active' as const,
      kanban_columns: input.kanban_columns || defaultColumns,
      settings: input.settings || {}
    }

    const { data, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select(`
        *,
        owner:users!owner_id(*),
        organization:organizations(*)
      `)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as Project, error: null }
  } catch (err) {
    return { data: null, error: 'プロジェクトの作成に失敗しました' }
  }
}

export async function updateProject(projectId: string, input: UpdateProjectInput): Promise<{ data: Project | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(input)
      .eq('id', projectId)
      .select(`
        *,
        owner:users!owner_id(*),
        organization:organizations(*)
      `)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as Project, error: null }
  } catch (err) {
    return { data: null, error: 'プロジェクトの更新に失敗しました' }
  }
}

export async function deleteProject(projectId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    return { error: 'プロジェクトの削除に失敗しました' }
  }
}

export async function getProject(projectId: string): Promise<{ data: Project | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        owner:users!owner_id(*),
        organization:organizations(*)
      `)
      .eq('id', projectId)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as Project, error: null }
  } catch (err) {
    return { data: null, error: 'プロジェクトの取得に失敗しました' }
  }
}

export async function getProjects(organizationId?: string): Promise<{ data: Project[]; error: string | null }> {
  try {
    let query = supabase
      .from('projects')
      .select(`
        *,
        owner:users!owner_id(*),
        organization:organizations(*)
      `)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      return { data: [], error: error.message }
    }

    return { data: data as Project[], error: null }
  } catch (err) {
    return { data: [], error: 'プロジェクトの取得に失敗しました' }
  }
}

// Drag and Drop Functions
export async function handleTaskDragDrop(result: DragDropResult): Promise<{ error: string | null }> {
  try {
    const { draggableId, source, destination } = result

    if (!destination) {
      return { error: null } // Dropped outside of droppable area
    }

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return { error: null } // Dropped in the same position
    }

    // Parse the droppable IDs (format: "column-{status}")
    const sourceStatus = source.droppableId.replace('column-', '')
    const destinationStatus = destination.droppableId.replace('column-', '')

    // Update task status if moved to different column
    const updateData: UpdateTaskInput = {
      position: destination.index
    }

    if (sourceStatus !== destinationStatus) {
      updateData.status = destinationStatus as any
      
      // Set completion timestamp if moved to completed
      if (destinationStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      } else if (sourceStatus === 'completed') {
        updateData.completed_at = undefined
      }
    }

    // Update the dragged task
    const { error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', draggableId)

    if (updateError) {
      return { error: updateError.message }
    }

    // Update positions of other tasks in the destination column
    if (sourceStatus !== destinationStatus) {
      // Get all tasks in the destination column
      const { data: destinationTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('id, position')
        .eq('status', destinationStatus)
        .neq('id', draggableId)
        .order('position', { ascending: true })

      if (fetchError) {
        return { error: fetchError.message }
      }

      // Update positions
      if (destinationTasks) {
        const updates = destinationTasks.map((task, index) => ({
          id: task.id,
          position: index >= destination.index ? index + 1 : index
        }))

        for (const update of updates) {
          await supabase
            .from('tasks')
            .update({ position: update.position })
            .eq('id', update.id)
        }
      }
    } else {
      // Same column, just reorder
      const { data: columnTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('id, position')
        .eq('status', sourceStatus)
        .order('position', { ascending: true })

      if (fetchError) {
        return { error: fetchError.message }
      }

      if (columnTasks) {
        // Remove the dragged task from the array
        const tasksWithoutDragged = columnTasks.filter(task => task.id !== draggableId)
        
        // Insert at new position
        tasksWithoutDragged.splice(destination.index, 0, { id: draggableId, position: 0 })
        
        // Update all positions
        for (let i = 0; i < tasksWithoutDragged.length; i++) {
          await supabase
            .from('tasks')
            .update({ position: i })
            .eq('id', tasksWithoutDragged[i].id)
        }
      }
    }

    return { error: null }
  } catch (err) {
    return { error: 'ドラッグ&ドロップの処理に失敗しました' }
  }
}

// Statistics Functions
export async function getTaskStatistics(projectId?: string, userId?: string): Promise<{ data: TaskStatistics | null; error: string | null }> {
  try {
    let query = supabase
      .from('tasks')
      .select('status, estimated_duration, actual_duration, end_time')

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (userId) {
      query = query.eq('assignee_id', userId)
    }

    const { data: tasks, error } = await query

    if (error) {
      return { data: null, error: error.message }
    }

    const now = new Date()
    const stats: TaskStatistics = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      review: tasks.filter(t => t.status === 'review').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      overdue: tasks.filter(t => t.end_time && new Date(t.end_time) < now && t.status !== 'completed').length,
      completion_rate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0,
      total_estimated_time: tasks.reduce((sum, t) => sum + (t.estimated_duration || 0), 0),
      total_actual_time: tasks.reduce((sum, t) => sum + (t.actual_duration || 0), 0)
    }

    // Calculate average completion time
    const completedTasksWithActualTime = tasks.filter(t => t.status === 'completed' && t.actual_duration)
    if (completedTasksWithActualTime.length > 0) {
      stats.avg_completion_time = Math.round(
        completedTasksWithActualTime.reduce((sum, t) => sum + (t.actual_duration || 0), 0) / completedTasksWithActualTime.length
      )
    }

    return { data: stats, error: null }
  } catch (err) {
    return { data: null, error: '統計情報の取得に失敗しました' }
  }
}

export async function getProjectStatistics(projectId: string): Promise<{ data: ProjectStatistics | null; error: string | null }> {
  try {
    // Get task statistics
    const { data: taskStats, error: taskStatsError } = await getTaskStatistics(projectId)
    if (taskStatsError || !taskStats) {
      return { data: null, error: taskStatsError || 'タスク統計の取得に失敗しました' }
    }

    // Get project details with member count
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        organization_members!inner(user_id)
      `)
      .eq('id', projectId)
      .single()

    if (projectError) {
      return { data: null, error: projectError.message }
    }

    // Calculate progress percentage
    const progressPercentage = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0

    const stats: ProjectStatistics = {
      task_stats: taskStats,
      member_count: project.organization_members?.length || 0,
      active_members: 0, // This would need additional logic to determine active members
      recent_activity: [], // This would need to be fetched from audit logs
      progress_percentage: progressPercentage
    }

    return { data: stats, error: null }
  } catch (err) {
    return { data: null, error: 'プロジェクト統計の取得に失敗しました' }
  }
}

// Utility Functions
export function getTaskPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'text-danger-600 bg-danger-50 border-danger-200'
    case 'high': return 'text-warning-600 bg-warning-50 border-warning-200'
    case 'medium': return 'text-tasktime-600 bg-tasktime-50 border-tasktime-200'
    case 'low': return 'text-success-600 bg-success-50 border-success-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function getTaskStatusColor(status: string): string {
  switch (status) {
    case 'todo': return 'text-gray-600 bg-gray-50 border-gray-200'
    case 'in_progress': return 'text-tasktime-600 bg-tasktime-50 border-tasktime-200'
    case 'review': return 'text-warning-600 bg-warning-50 border-warning-200'
    case 'completed': return 'text-success-600 bg-success-50 border-success-200'
    case 'cancelled': return 'text-danger-600 bg-danger-50 border-danger-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function formatTaskDuration(minutes?: number): string {
  if (!minutes) return '-'
  
  if (minutes < 60) {
    return `${minutes}分`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours}時間`
  }
  
  return `${hours}時間${remainingMinutes}分`
}

export function isTaskOverdue(task: Task): boolean {
  if (!task.end_time || task.status === 'completed') return false
  return new Date(task.end_time) < new Date()
}

export function getTaskDueDateStatus(task: Task): 'overdue' | 'due_soon' | 'due_later' | 'no_due_date' {
  if (!task.end_time) return 'no_due_date'
  
  const now = new Date()
  const dueDate = new Date(task.end_time)
  const timeDiff = dueDate.getTime() - now.getTime()
  const daysDiff = timeDiff / (1000 * 3600 * 24)
  
  if (timeDiff < 0 && task.status !== 'completed') {
    return 'overdue'
  } else if (daysDiff <= 1) {
    return 'due_soon'
  } else {
    return 'due_later'
  }
}