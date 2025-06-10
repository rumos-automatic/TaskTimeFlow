import { google, tasks_v1 } from 'googleapis'
import { getAuthenticatedClient } from './auth'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types/tasks'

const tasksApi = google.tasks('v1')

interface GoogleTask {
  id?: string
  title: string
  notes?: string
  status?: 'needsAction' | 'completed'
  due?: string
  completed?: string
  updated?: string
  parent?: string
  position?: string
  links?: Array<{
    type: string
    description?: string
    link: string
  }>
}

// Get user's task lists
export async function getTaskLists(userId: string) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  try {
    const response = await tasksApi.tasklists.list({
      auth,
      maxResults: 100
    })

    return response.data.items || []
  } catch (error) {
    console.error('Error fetching task lists:', error)
    throw error
  }
}

// Get tasks from a specific list
export async function getTasks(
  userId: string,
  taskListId: string = '@default',
  options?: {
    maxResults?: number
    showCompleted?: boolean
    showHidden?: boolean
    dueMin?: string
    dueMax?: string
  }
) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  try {
    const response = await tasksApi.tasks.list({
      auth,
      tasklist: taskListId,
      maxResults: options?.maxResults || 100,
      showCompleted: options?.showCompleted !== false,
      showHidden: options?.showHidden || false,
      dueMin: options?.dueMin,
      dueMax: options?.dueMax
    })

    return response.data.items || []
  } catch (error) {
    console.error('Error fetching tasks:', error)
    throw error
  }
}

// Create a task in Google Tasks
export async function createGoogleTask(
  userId: string,
  task: Task,
  taskListId: string = '@default'
) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  const googleTask: GoogleTask = {
    title: task.title,
    notes: task.description || '',
    status: task.status === 'completed' ? 'completed' : 'needsAction',
    due: task.due_date ? new Date(task.due_date).toISOString() : undefined
  }

  try {
    const response = await tasksApi.tasks.insert({
      auth,
      tasklist: taskListId,
      requestBody: googleTask
    })

    // Store sync mapping
    if (response.data.id) {
      await storeSyncMapping(userId, task.id, response.data.id, 'tasks')
    }

    return response.data
  } catch (error) {
    console.error('Error creating Google task:', error)
    throw error
  }
}

// Update a task in Google Tasks
export async function updateGoogleTask(
  userId: string,
  taskId: string,
  updates: Partial<GoogleTask>,
  taskListId: string = '@default'
) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  try {
    const response = await tasksApi.tasks.patch({
      auth,
      tasklist: taskListId,
      task: taskId,
      requestBody: updates
    })

    return response.data
  } catch (error) {
    console.error('Error updating Google task:', error)
    throw error
  }
}

// Delete a task from Google Tasks
export async function deleteGoogleTask(
  userId: string,
  taskId: string,
  taskListId: string = '@default'
) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  try {
    await tasksApi.tasks.delete({
      auth,
      tasklist: taskListId,
      task: taskId
    })

    // Remove sync mapping
    await removeSyncMapping(userId, taskId, 'tasks')

    return { success: true }
  } catch (error) {
    console.error('Error deleting Google task:', error)
    throw error
  }
}

// Move task to different position or parent
export async function moveGoogleTask(
  userId: string,
  taskId: string,
  taskListId: string = '@default',
  parent?: string,
  previous?: string
) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  try {
    const response = await tasksApi.tasks.move({
      auth,
      tasklist: taskListId,
      task: taskId,
      parent,
      previous
    })

    return response.data
  } catch (error) {
    console.error('Error moving Google task:', error)
    throw error
  }
}

// Create a task list
export async function createTaskList(userId: string, title: string) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  try {
    const response = await tasksApi.tasklists.insert({
      auth,
      requestBody: {
        title
      }
    })

    return response.data
  } catch (error) {
    console.error('Error creating task list:', error)
    throw error
  }
}

// Sync TaskTimeFlow tasks to Google Tasks
export async function syncTasksToGoogle(
  userId: string,
  tasks: Task[],
  taskListId: string = '@default'
) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  const results = {
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [] as GoogleSyncError[]
  }

  // Get existing sync mappings
  const { data: syncMappings } = await supabase
    .from('google_sync_mappings')
    .select('*')
    .eq('user_id', userId)
    .eq('sync_type', 'tasks')

  const mappingsByTaskId = new Map(
    syncMappings?.map(m => [m.tasktime_id, m]) || []
  )

  // Get all Google tasks for comparison
  const googleTasks = await getTasks(userId, taskListId, { showCompleted: true })
  const googleTasksById = new Map(
    googleTasks.filter(t => t.id).map(t => [t.id!, t])
  )

  // Process each TaskTimeFlow task
  for (const task of tasks) {
    try {
      const mapping = mappingsByTaskId.get(task.id)
      
      if (mapping) {
        const googleTask = googleTasksById.get(mapping.google_id)
        
        if (googleTask) {
          // Check if update is needed
          if (shouldUpdateGoogleTask(task, googleTask)) {
            await updateGoogleTask(userId, mapping.google_id, {
              title: task.title,
              notes: task.description || '',
              status: task.status === 'completed' ? 'completed' : 'needsAction',
              due: task.due_date ? new Date(task.due_date).toISOString() : undefined
            }, taskListId)
            results.updated++
          }
        } else {
          // Google task was deleted, recreate it
          await createGoogleTask(userId, task, taskListId)
          results.created++
        }
      } else {
        // Create new Google task
        await createGoogleTask(userId, task, taskListId)
        results.created++
      }
    } catch (error) {
      console.error(`Error syncing task ${task.id}:`, error)
      results.errors.push({ taskId: task.id, error: (error as Error).message })
    }
  }

  // Check for tasks deleted in TaskTimeFlow
  const taskIds = new Set(tasks.map(t => t.id))
  for (const mapping of syncMappings || []) {
    if (!taskIds.has(mapping.tasktime_id)) {
      try {
        await deleteGoogleTask(userId, mapping.google_id, taskListId)
        results.deleted++
      } catch (error) {
        console.error(`Error deleting Google task ${mapping.google_id}:`, error)
        results.errors.push({ googleId: mapping.google_id, error: (error as Error).message })
      }
    }
  }

  return results
}

// Sync Google Tasks to TaskTimeFlow
export async function syncTasksFromGoogle(
  userId: string,
  projectId: string,
  taskListId: string = '@default'
) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  const results = {
    created: 0,
    updated: 0,
    errors: [] as GoogleSyncError[]
  }

  // Get all Google tasks
  const googleTasks = await getTasks(userId, taskListId, { showCompleted: true })

  // Get existing sync mappings
  const { data: syncMappings } = await supabase
    .from('google_sync_mappings')
    .select('*')
    .eq('user_id', userId)
    .eq('sync_type', 'tasks')

  const mappingsByGoogleId = new Map(
    syncMappings?.map(m => [m.google_id, m]) || []
  )

  // Process each Google task
  for (const googleTask of googleTasks) {
    try {
      if (!googleTask.id) continue
      const mapping = mappingsByGoogleId.get(googleTask.id)
      
      if (mapping) {
        // Update existing TaskTimeFlow task
        const { data: existingTask } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', mapping.tasktime_id)
          .single()

        if (existingTask && shouldUpdateTaskTimeFlowTask(existingTask, googleTask)) {
          await supabase
            .from('tasks')
            .update({
              title: googleTask.title || 'Untitled Task',
              description: googleTask.notes || '',
              status: googleTask.status === 'completed' ? 'completed' : 'todo',
              due_date: googleTask.due ? new Date(googleTask.due).toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', mapping.tasktime_id)
          
          results.updated++
        }
      } else {
        // Create new TaskTimeFlow task
        const { data: newTask } = await supabase
          .from('tasks')
          .insert({
            title: googleTask.title || 'Untitled Task',
            description: googleTask.notes || '',
            status: googleTask.status === 'completed' ? 'completed' : 'todo',
            due_date: googleTask.due ? new Date(googleTask.due).toISOString() : null,
            project_id: projectId,
            created_by: userId,
            priority: 'medium',
            position: 999 // Will be reordered later
          })
          .select()
          .single()

        if (newTask && googleTask.id) {
          await storeSyncMapping(userId, newTask.id, googleTask.id, 'tasks')
          results.created++
        }
      }
    } catch (error) {
      console.error(`Error syncing Google task ${googleTask.id}:`, error)
      results.errors.push({ googleTaskId: googleTask.id, error: error.message })
    }
  }

  return results
}

// Helper functions
async function storeSyncMapping(
  userId: string,
  taskTimeId: string,
  googleId: string,
  syncType: 'calendar' | 'tasks'
) {
  await supabase
    .from('google_sync_mappings')
    .upsert({
      user_id: userId,
      tasktime_id: taskTimeId,
      google_id: googleId,
      sync_type: syncType,
      last_synced_at: new Date().toISOString()
    })
}

async function removeSyncMapping(
  userId: string,
  googleId: string,
  syncType: 'calendar' | 'tasks'
) {
  await supabase
    .from('google_sync_mappings')
    .delete()
    .eq('user_id', userId)
    .eq('google_id', googleId)
    .eq('sync_type', syncType)
}

function shouldUpdateGoogleTask(task: Task, googleTask: GoogleTask): boolean {
  return (
    task.title !== googleTask.title ||
    task.description !== (googleTask.notes || '') ||
    (task.status === 'completed') !== (googleTask.status === 'completed') ||
    (task.due_date ? new Date(task.due_date).toDateString() : '') !== 
    (googleTask.due ? new Date(googleTask.due).toDateString() : '')
  )
}

function shouldUpdateTaskTimeFlowTask(task: Task, googleTask: GoogleTask): boolean {
  return (
    task.title !== (googleTask.title || 'Untitled Task') ||
    task.description !== (googleTask.notes || '') ||
    (task.status === 'completed') !== (googleTask.status === 'completed') ||
    (task.due_date ? new Date(task.due_date).toDateString() : '') !== 
    (googleTask.due ? new Date(googleTask.due).toDateString() : '')
  )
}

// Create TaskTimeFlow task list
export async function createTaskTimeFlowTaskList(userId: string) {
  try {
    const taskList = await createTaskList(userId, 'TaskTimeFlow')
    
    // Store the task list ID for future use
    await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        google_task_list_id: taskList.id,
        updated_at: new Date().toISOString()
      })

    return taskList
  } catch (error) {
    console.error('Error creating TaskTimeFlow task list:', error)
    throw error
  }
}