'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { 
  getTasks, 
  getTask, 
  createTask, 
  updateTask, 
  deleteTask, 
  handleTaskDragDrop,
  getTaskStatistics
} from '@/lib/tasks'
import type { 
  Task, 
  CreateTaskInput, 
  UpdateTaskInput, 
  TaskFilter, 
  TaskSort, 
  DragDropResult,
  TaskStatistics 
} from '@/types/tasks'

export function useTasks(projectId?: string, filter?: TaskFilter, sort?: TaskSort) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['tasks', projectId, filter, sort],
    queryFn: () => getTasks(projectId, filter, sort),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    select: (result) => result.data
  })
}

export function useTask(taskId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTask(taskId),
    enabled: !!user && !!taskId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    select: (result) => result.data
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: (result, variables) => {
      if (result.data) {
        // Invalidate and refetch tasks
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        queryClient.invalidateQueries({ queryKey: ['task-statistics'] })
        
        // Add to cache
        queryClient.setQueryData(['task', result.data.id], result.data)
      }
    }
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) => 
      updateTask(taskId, input),
    onSuccess: (result, variables) => {
      if (result.data) {
        // Update cached task
        queryClient.setQueryData(['task', variables.taskId], result.data)
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        queryClient.invalidateQueries({ queryKey: ['task-statistics'] })
      }
    }
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: (result, taskId) => {
      if (!result.error) {
        // Remove from cache
        queryClient.removeQueries({ queryKey: ['task', taskId] })
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        queryClient.invalidateQueries({ queryKey: ['task-statistics'] })
      }
    }
  })
}

export function useTaskDragDrop() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (result: DragDropResult) => handleTaskDragDrop(result),
    onSuccess: () => {
      // Invalidate tasks to trigger re-fetch with updated positions
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-statistics'] })
    },
    onError: (error) => {
      // Revert optimistic updates if any
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })
}

export function useTaskStatistics(projectId?: string, userId?: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['task-statistics', projectId, userId],
    queryFn: () => getTaskStatistics(projectId, userId),
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    select: (result) => result.data
  })
}

// Real-time hooks
export function useTaskUpdates(projectId?: string) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useQuery({
    queryKey: ['task-updates', projectId],
    queryFn: async () => {
      if (!user) return null

      // Subscribe to task changes
      const { supabase } = await import('@/lib/supabase')
      
      const channel = supabase
        .channel(`tasks_${projectId || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: projectId ? `project_id=eq.${projectId}` : undefined
          },
          (payload) => {
            // Invalidate tasks on any change
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            queryClient.invalidateQueries({ queryKey: ['task-statistics'] })
            
            // If it's an update, update the specific task cache
            if (payload.eventType === 'UPDATE' && payload.new) {
              queryClient.setQueryData(['task', payload.new.id], payload.new)
            }
            
            // If it's a delete, remove from cache
            if (payload.eventType === 'DELETE' && payload.old) {
              queryClient.removeQueries({ queryKey: ['task', payload.old.id] })
            }
          }
        )
        .subscribe()

      return channel
    },
    enabled: !!user,
    staleTime: Infinity, // Never go stale
    refetchOnMount: false,
    refetchOnWindowFocus: false
  })
}

// Optimistic updates
export function useOptimisticTaskUpdate() {
  const queryClient = useQueryClient()

  const optimisticUpdate = (taskId: string, updates: Partial<Task>) => {
    queryClient.setQueryData(['task', taskId], (oldData: Task | undefined) => {
      if (!oldData) return oldData
      return { ...oldData, ...updates }
    })

    // Update tasks list cache
    queryClient.setQueryData(['tasks'], (oldData: { data: Task[] } | undefined) => {
      if (!oldData) return oldData
      return {
        ...oldData,
        data: oldData.data.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        )
      }
    })
  }

  const revertUpdate = (taskId: string) => {
    queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  return { optimisticUpdate, revertUpdate }
}

// Bulk operations
export function useBulkTaskOperations() {
  const queryClient = useQueryClient()
  const updateTask = useUpdateTask()

  const bulkUpdate = useMutation({
    mutationFn: async ({ taskIds, updates }: { taskIds: string[]; updates: UpdateTaskInput }) => {
      const results = await Promise.all(
        taskIds.map(taskId => updateTask.mutateAsync({ taskId, input: updates }))
      )
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-statistics'] })
    }
  })

  const bulkDelete = useMutation({
    mutationFn: async (taskIds: string[]) => {
      const { deleteTask } = await import('@/lib/tasks')
      const results = await Promise.all(taskIds.map(taskId => deleteTask(taskId)))
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-statistics'] })
    }
  })

  return { bulkUpdate, bulkDelete }
}