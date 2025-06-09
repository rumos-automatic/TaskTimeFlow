'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

interface SyncStatus {
  status: 'synced' | 'pending' | 'error' | 'unknown'
  lastSyncTime?: Date
  pendingChanges: number
  conflicts?: any[]
}

export function useTimelineSyncWithGoogle() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [syncStatus, setSyncStatus] = useState<SyncStatus['status']>('unknown')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [pendingChanges, setPendingChanges] = useState(0)

  // Check sync status
  const { data: syncInfo } = useQuery({
    queryKey: ['timeline-sync-status'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Get last sync log
      const { data: lastSync } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('direction', 'bidirectional')
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      // Get pending sync mappings (items that need sync)
      const { data: pendingMappings } = await supabase
        .from('google_sync_mappings')
        .select('count')
        .eq('user_id', user.id)
        .eq('sync_type', 'calendar')
        .lt('last_synced_at', new Date(Date.now() - 60000).toISOString()) // Older than 1 minute

      return {
        lastSync,
        pendingCount: pendingMappings?.[0]?.count || 0
      }
    },
    refetchInterval: 30000 // Check every 30 seconds
  })

  // Update state when sync info changes
  useEffect(() => {
    if (syncInfo) {
      setLastSyncTime(syncInfo.lastSync?.completed_at ? new Date(syncInfo.lastSync.completed_at) : null)
      setPendingChanges(syncInfo.pendingCount)
      
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
    mutationFn: async (date: Date) => {
      const response = await fetch('/api/google/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          syncType: 'to_google',
          includeCalendar: true,
          includeTasks: false,
          date: date.toISOString()
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeline-sync-status'] })
      setSyncStatus('synced')
      toast({
        title: '同期完了',
        description: `Googleカレンダーに${data.results?.calendar?.created || 0}件作成、${data.results?.calendar?.updated || 0}件更新しました`,
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
    mutationFn: async (date: Date) => {
      const response = await fetch('/api/google/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          syncType: 'from_google',
          includeCalendar: true,
          includeTasks: false,
          date: date.toISOString()
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeline-sync-status'] })
      queryClient.invalidateQueries({ queryKey: ['timeline-slots'] })
      setSyncStatus('synced')
      toast({
        title: '同期完了',
        description: `Googleカレンダーから${data.results?.calendar?.created || 0}件のイベントを取得しました`,
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
    mutationFn: async (date: Date) => {
      const response = await fetch('/api/google/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          syncType: 'bidirectional',
          includeCalendar: true,
          includeTasks: false,
          date: date.toISOString()
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeline-sync-status'] })
      queryClient.invalidateQueries({ queryKey: ['timeline-slots'] })
      setSyncStatus('synced')
      
      const calendar = data.results?.calendar
      const totalItems = (calendar?.created || 0) + (calendar?.updated || 0)
      
      toast({
        title: '双方向同期完了',
        description: `${totalItems}件のアイテムを同期しました`,
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
    syncToGoogle: syncToGoogleMutation.mutateAsync,
    syncFromGoogle: syncFromGoogleMutation.mutateAsync,
    performBidirectionalSync: bidirectionalSyncMutation.mutateAsync,
    isSyncing: syncToGoogleMutation.isPending || 
               syncFromGoogleMutation.isPending || 
               bidirectionalSyncMutation.isPending
  }
}