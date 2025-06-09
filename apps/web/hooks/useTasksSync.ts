'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

interface TasksSyncStatus {
  status: 'synced' | 'pending' | 'error' | 'unknown'
  lastSyncTime?: Date
  pendingChanges: number
  conflicts?: any[]
}

interface SyncStats {
  totalTasks: number
  syncedTasks: number
  pendingTasks: number
}

export function useTasksSyncWithGoogle(projectId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [syncStatus, setSyncStatus] = useState<TasksSyncStatus['status']>('unknown')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [pendingChanges, setPendingChanges] = useState(0)
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)

  // Check sync status for tasks
  const { data: syncInfo } = useQuery({
    queryKey: ['tasks-sync-status', projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Get last sync log for tasks
      const { data: lastSync } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      // Get total tasks in project
      const { data: totalTasksData } = await supabase
        .from('tasks')
        .select('count')
        .eq('project_id', projectId)

      // Get synced tasks (with Google mapping)
      const { data: syncedTasksData } = await supabase
        .from('google_sync_mappings')
        .select('count')
        .eq('user_id', user.id)
        .eq('sync_type', 'tasks')

      // Get pending mappings (tasks that need sync)
      const { data: pendingMappings } = await supabase
        .from('google_sync_mappings')
        .select('count')
        .eq('user_id', user.id)
        .eq('sync_type', 'tasks')
        .lt('last_synced_at', new Date(Date.now() - 60000).toISOString()) // Older than 1 minute

      const totalTasks = totalTasksData?.[0]?.count || 0
      const syncedTasks = syncedTasksData?.[0]?.count || 0
      const pendingTasks = pendingMappings?.[0]?.count || 0

      return {
        lastSync,
        pendingCount: pendingTasks,
        stats: {
          totalTasks,
          syncedTasks,
          pendingTasks
        }
      }
    },
    refetchInterval: 30000, // Check every 30 seconds
    enabled: !!projectId
  })

  // Update state when sync info changes
  useEffect(() => {
    if (syncInfo) {
      setLastSyncTime(syncInfo.lastSync?.completed_at ? new Date(syncInfo.lastSync.completed_at) : null)
      setPendingChanges(syncInfo.pendingCount)
      setSyncStats(syncInfo.stats)
      
      if (syncInfo.lastSync?.status === 'completed' && syncInfo.pendingCount === 0) {
        setSyncStatus('synced')
      } else if (syncInfo.pendingCount > 0) {
        setSyncStatus('pending')
      } else {
        setSyncStatus('unknown')
      }
    }
  }, [syncInfo])

  // Sync to Google mutation
  const syncToGoogleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/google/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          syncType: 'to_google',
          includeCalendar: false,
          includeTasks: true,
          projectId
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-sync-status', projectId] })
      setSyncStatus('synced')
      toast({
        title: '同期完了',
        description: `Google Todoに${data.results?.tasks?.created || 0}件作成、${data.results?.tasks?.updated || 0}件更新しました`,
      })
    },
    onError: (error) => {
      setSyncStatus('error')
      toast({
        title: 'エラー',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  // Sync from Google mutation
  const syncFromGoogleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/google/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          syncType: 'from_google',
          includeCalendar: false,
          includeTasks: true,
          projectId
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-sync-status', projectId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      setSyncStatus('synced')
      toast({
        title: '同期完了',
        description: `Google Todoから${data.results?.tasks?.created || 0}件のタスクを取得しました`,
      })
    },
    onError: (error) => {
      setSyncStatus('error')
      toast({
        title: 'エラー',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  // Bidirectional sync mutation
  const bidirectionalSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/google/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          syncType: 'bidirectional',
          includeCalendar: false,
          includeTasks: true,
          projectId
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-sync-status', projectId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      setSyncStatus('synced')
      
      const tasks = data.results?.tasks
      const totalItems = (tasks?.created || 0) + (tasks?.updated || 0)
      
      toast({
        title: '双方向同期完了',
        description: `${totalItems}件のタスクを同期しました`,
      })
    },
    onError: (error) => {
      setSyncStatus('error')
      toast({
        title: 'エラー',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  return {
    syncStatus,
    lastSyncTime,
    pendingChanges,
    syncStats,
    syncToGoogle: syncToGoogleMutation.mutateAsync,
    syncFromGoogle: syncFromGoogleMutation.mutateAsync,
    performBidirectionalSync: bidirectionalSyncMutation.mutateAsync,
    isSyncing: syncToGoogleMutation.isPending || 
               syncFromGoogleMutation.isPending || 
               bidirectionalSyncMutation.isPending
  }
}