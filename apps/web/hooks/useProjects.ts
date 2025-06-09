'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { 
  getProjects, 
  getProject, 
  createProject, 
  updateProject, 
  deleteProject,
  getProjectStatistics
} from '@/lib/tasks'
import type { 
  Project, 
  CreateProjectInput, 
  UpdateProjectInput,
  ProjectStatistics 
} from '@/types/tasks'

export function useProjects(organizationId?: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['projects', organizationId],
    queryFn: () => getProjects(organizationId),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    select: (result) => result.data
  })
}

export function useProject(projectId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: !!user && !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    select: (result) => result.data
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: (result, variables) => {
      if (result.data) {
        // Invalidate and refetch projects
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        
        // Add to cache
        queryClient.setQueryData(['project', result.data.id], result.data)
      }
    }
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: UpdateProjectInput }) => 
      updateProject(projectId, input),
    onSuccess: (result, variables) => {
      if (result.data) {
        // Update cached project
        queryClient.setQueryData(['project', variables.projectId], result.data)
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      }
    }
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: (result, projectId) => {
      if (!result.error) {
        // Remove from cache
        queryClient.removeQueries({ queryKey: ['project', projectId] })
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
      }
    }
  })
}

export function useProjectStatistics(projectId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['project-statistics', projectId],
    queryFn: () => getProjectStatistics(projectId),
    enabled: !!user && !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    select: (result) => result.data
  })
}

// Real-time project updates
export function useProjectUpdates(organizationId?: string) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useQuery({
    queryKey: ['project-updates', organizationId],
    queryFn: async () => {
      if (!user) return null

      // Subscribe to project changes
      const { supabase } = await import('@/lib/supabase')
      
      const channel = supabase
        .channel(`projects_${organizationId || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
            filter: organizationId ? `organization_id=eq.${organizationId}` : undefined
          },
          (payload) => {
            // Invalidate projects on any change
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            
            // If it's an update, update the specific project cache
            if (payload.eventType === 'UPDATE' && payload.new) {
              queryClient.setQueryData(['project', payload.new.id], payload.new)
            }
            
            // If it's a delete, remove from cache
            if (payload.eventType === 'DELETE' && payload.old) {
              queryClient.removeQueries({ queryKey: ['project', payload.old.id] })
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