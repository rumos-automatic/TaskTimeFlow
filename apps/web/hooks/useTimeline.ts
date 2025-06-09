'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { 
  getTimelineView,
  getTimelineSlots,
  getTimeBlocks,
  createTimelineSlot,
  updateTimelineSlot,
  deleteTimelineSlot,
  createTimeBlock,
  updateTimeBlock,
  deleteTimeBlock,
  calculateTimelineAnalytics,
  autoScheduleTasks
} from '@/lib/timeline'
import type { 
  TimelineView,
  TimelineSlot,
  TimeBlock,
  CreateTimelineSlotInput,
  UpdateTimelineSlotInput,
  CreateTimeBlockInput,
  UpdateTimeBlockInput,
  TimelineFilter,
  TimelineAnalytics,
  AutoScheduleRequest
} from '@/types/timeline'

export function useTimelineView(date: Date, filter?: TimelineFilter) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['timeline-view', date.toISOString().split('T')[0], user?.id, filter],
    queryFn: () => user ? getTimelineView(date, user.id, filter) : Promise.resolve({ data: null, error: 'No user' }),
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    select: (result) => result.data
  })
}

export function useTimelineSlots(date: Date, filter?: TimelineFilter) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['timeline-slots', date.toISOString().split('T')[0], user?.id, filter],
    queryFn: () => user ? getTimelineSlots(date, user.id, filter) : Promise.resolve({ data: [], error: 'No user' }),
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    select: (result) => result.data
  })
}

export function useTimeBlocks(dayOfWeek?: number) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['time-blocks', user?.id, dayOfWeek],
    queryFn: () => user ? getTimeBlocks(user.id, dayOfWeek) : Promise.resolve({ data: [], error: 'No user' }),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    select: (result) => result.data
  })
}

export function useCreateTimelineSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTimelineSlotInput) => createTimelineSlot(input),
    onSuccess: (result, variables) => {
      if (result.data) {
        // Invalidate timeline queries
        queryClient.invalidateQueries({ queryKey: ['timeline-view'] })
        queryClient.invalidateQueries({ queryKey: ['timeline-slots'] })
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        queryClient.invalidateQueries({ queryKey: ['timeline-analytics'] })
        
        // Add to cache
        queryClient.setQueryData(['timeline-slot', result.data.id], result.data)
      }
    }
  })
}

export function useUpdateTimelineSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ slotId, input }: { slotId: string; input: UpdateTimelineSlotInput }) => 
      updateTimelineSlot(slotId, input),
    onSuccess: (result, variables) => {
      if (result.data) {
        // Update cached slot
        queryClient.setQueryData(['timeline-slot', variables.slotId], result.data)
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['timeline-view'] })
        queryClient.invalidateQueries({ queryKey: ['timeline-slots'] })
        queryClient.invalidateQueries({ queryKey: ['timeline-analytics'] })
      }
    }
  })
}

export function useDeleteTimelineSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slotId: string) => deleteTimelineSlot(slotId),
    onSuccess: (result, slotId) => {
      if (!result.error) {
        // Remove from cache
        queryClient.removeQueries({ queryKey: ['timeline-slot', slotId] })
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['timeline-view'] })
        queryClient.invalidateQueries({ queryKey: ['timeline-slots'] })
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        queryClient.invalidateQueries({ queryKey: ['timeline-analytics'] })
      }
    }
  })
}

export function useCreateTimeBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTimeBlockInput) => createTimeBlock(input),
    onSuccess: (result, variables) => {
      if (result.data) {
        // Invalidate time blocks and timeline views
        queryClient.invalidateQueries({ queryKey: ['time-blocks'] })
        queryClient.invalidateQueries({ queryKey: ['timeline-view'] })
        
        // Add to cache
        queryClient.setQueryData(['time-block', result.data.id], result.data)
      }
    }
  })
}

export function useUpdateTimeBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ blockId, input }: { blockId: string; input: UpdateTimeBlockInput }) => 
      updateTimeBlock(blockId, input),
    onSuccess: (result, variables) => {
      if (result.data) {
        // Update cached block
        queryClient.setQueryData(['time-block', variables.blockId], result.data)
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['time-blocks'] })
        queryClient.invalidateQueries({ queryKey: ['timeline-view'] })
      }
    }
  })
}

export function useDeleteTimeBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (blockId: string) => deleteTimeBlock(blockId),
    onSuccess: (result, blockId) => {
      if (!result.error) {
        // Remove from cache
        queryClient.removeQueries({ queryKey: ['time-block', blockId] })
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['time-blocks'] })
        queryClient.invalidateQueries({ queryKey: ['timeline-view'] })
      }
    }
  })
}

export function useTimelineAnalytics(date: Date) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['timeline-analytics', date.toISOString().split('T')[0], user?.id],
    queryFn: () => user ? calculateTimelineAnalytics(user.id, date) : Promise.resolve({ data: null, error: 'No user' }),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    select: (result) => result.data
  })
}

export function useAutoSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: AutoScheduleRequest) => autoScheduleTasks(request),
    onSuccess: (result, variables) => {
      if (result.data) {
        // Invalidate all timeline-related queries
        queryClient.invalidateQueries({ queryKey: ['timeline-view'] })
        queryClient.invalidateQueries({ queryKey: ['timeline-slots'] })
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        queryClient.invalidateQueries({ queryKey: ['timeline-analytics'] })
      }
    }
  })
}

// Real-time timeline updates
export function useTimelineUpdates(date: Date) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useQuery({
    queryKey: ['timeline-updates', date.toISOString().split('T')[0], user?.id],
    queryFn: async () => {
      if (!user) return null

      // Subscribe to timeline slot changes
      const { supabase } = await import('@/lib/supabase')
      
      const channel = supabase
        .channel(`timeline_${user.id}_${date.toISOString().split('T')[0]}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'timeline_slots',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            // Invalidate timeline queries on any change
            queryClient.invalidateQueries({ queryKey: ['timeline-view'] })
            queryClient.invalidateQueries({ queryKey: ['timeline-slots'] })
            queryClient.invalidateQueries({ queryKey: ['timeline-analytics'] })
            
            // If it's an update, update the specific slot cache
            if (payload.eventType === 'UPDATE' && payload.new) {
              queryClient.setQueryData(['timeline-slot', payload.new.id], payload.new)
            }
            
            // If it's a delete, remove from cache
            if (payload.eventType === 'DELETE' && payload.old) {
              queryClient.removeQueries({ queryKey: ['timeline-slot', payload.old.id] })
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'time_blocks',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            // Invalidate time block queries
            queryClient.invalidateQueries({ queryKey: ['time-blocks'] })
            queryClient.invalidateQueries({ queryKey: ['timeline-view'] })
            
            // Update cache
            if (payload.eventType === 'UPDATE' && payload.new) {
              queryClient.setQueryData(['time-block', payload.new.id], payload.new)
            }
            
            if (payload.eventType === 'DELETE' && payload.old) {
              queryClient.removeQueries({ queryKey: ['time-block', payload.old.id] })
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

// Optimistic updates for drag and drop
export function useOptimisticTimelineUpdate() {
  const queryClient = useQueryClient()

  const optimisticSlotUpdate = (slotId: string, updates: Partial<TimelineSlot>) => {
    queryClient.setQueryData(['timeline-slot', slotId], (oldData: TimelineSlot | undefined) => {
      if (!oldData) return oldData
      return { ...oldData, ...updates }
    })

    // Update timeline view cache
    queryClient.setQueryData(['timeline-view'], (oldData: { data: TimelineView } | undefined) => {
      if (!oldData?.data) return oldData
      return {
        ...oldData,
        data: {
          ...oldData.data,
          timeline_slots: oldData.data.timeline_slots.map(slot => 
            slot.id === slotId ? { ...slot, ...updates } : slot
          )
        }
      }
    })
  }

  const revertSlotUpdate = (slotId: string) => {
    queryClient.invalidateQueries({ queryKey: ['timeline-slot', slotId] })
    queryClient.invalidateQueries({ queryKey: ['timeline-view'] })
    queryClient.invalidateQueries({ queryKey: ['timeline-slots'] })
  }

  return { optimisticSlotUpdate, revertSlotUpdate }
}

// Bulk operations
export function useBulkTimelineOperations() {
  const queryClient = useQueryClient()
  const updateSlot = useUpdateTimelineSlot()
  const deleteSlot = useDeleteTimelineSlot()

  const bulkUpdateSlots = useMutation({
    mutationFn: async ({ slotIds, updates }: { slotIds: string[]; updates: UpdateTimelineSlotInput }) => {
      const results = await Promise.all(
        slotIds.map(slotId => updateSlot.mutateAsync({ slotId, input: updates }))
      )
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline-view'] })
      queryClient.invalidateQueries({ queryKey: ['timeline-slots'] })
      queryClient.invalidateQueries({ queryKey: ['timeline-analytics'] })
    }
  })

  const bulkDeleteSlots = useMutation({
    mutationFn: async (slotIds: string[]) => {
      const results = await Promise.all(slotIds.map(slotId => deleteSlot.mutateAsync(slotId)))
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline-view'] })
      queryClient.invalidateQueries({ queryKey: ['timeline-slots'] })
      queryClient.invalidateQueries({ queryKey: ['timeline-analytics'] })
    }
  })

  return { bulkUpdateSlots, bulkDeleteSlots }
}

// Timeline navigation helpers
export function useTimelineNavigation() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const getWeekStart = (date: Date, weekStartsOn: number = 1) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : weekStartsOn - day)
    return new Date(d.setDate(diff))
  }

  const getWeekEnd = (weekStart: Date) => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return weekEnd
  }

  const navigateToDate = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }

  const navigateToToday = () => {
    return new Date(today)
  }

  const navigateToNextDay = (currentDate: Date) => {
    const nextDay = new Date(currentDate)
    nextDay.setDate(currentDate.getDate() + 1)
    return nextDay
  }

  const navigateToPreviousDay = (currentDate: Date) => {
    const previousDay = new Date(currentDate)
    previousDay.setDate(currentDate.getDate() - 1)
    return previousDay
  }

  const navigateToNextWeek = (currentDate: Date) => {
    const nextWeek = new Date(currentDate)
    nextWeek.setDate(currentDate.getDate() + 7)
    return nextWeek
  }

  const navigateToPreviousWeek = (currentDate: Date) => {
    const previousWeek = new Date(currentDate)
    previousWeek.setDate(currentDate.getDate() - 7)
    return previousWeek
  }

  return {
    today,
    getWeekStart,
    getWeekEnd,
    navigateToDate,
    navigateToToday,
    navigateToNextDay,
    navigateToPreviousDay,
    navigateToNextWeek,
    navigateToPreviousWeek
  }
}