'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { hasValidGoogleIntegration, revokeGoogleAccess } from '@/lib/google/auth'

interface GoogleIntegration {
  id: string
  user_id: string
  provider: string
  status: 'active' | 'paused' | 'revoked' | 'error'
  provider_email: string
  provider_data: {
    name?: string
    picture?: string
    locale?: string
  }
  sync_enabled: boolean
  sync_calendar: boolean
  sync_tasks: boolean
  calendar_id: string
  task_list_id: string
  last_synced_at?: string
  created_at: string
  updated_at: string
}

interface SyncResult {
  success: boolean
  itemsSynced: number
  errors?: any[]
}

export function useGoogleIntegration() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Fetch Google integration status
  const { data: integration, isLoading, error } = useQuery<GoogleIntegration | null>({
    queryKey: ['google-integration'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // No integration found
        throw error
      }

      return data
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  })

  // Connect Google account
  const connectMutation = useMutation<string, Error>({
    mutationFn: async () => {
      const response = await fetch('/api/auth/google')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate Google auth')
      }

      return data.authUrl
    }
  })

  // Disconnect Google account
  const disconnectMutation = useMutation<void, Error>({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      await revokeGoogleAccess(user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-integration'] })
      toast({
        title: '連携解除完了',
        description: 'Googleアカウントの連携を解除しました',
      })
    },
    onError: (error) => {
      toast({
        title: 'エラー',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  // Sync with Google
  const syncMutation = useMutation<SyncResult, Error, { projectId?: string }>({
    mutationFn: async ({ projectId }) => {
      const response = await fetch('/api/google/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          syncType: 'bidirectional',
          includeCalendar: true,
          includeTasks: true,
          projectId
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      const itemsSynced = 
        (data.results?.calendar?.created || 0) +
        (data.results?.calendar?.updated || 0) +
        (data.results?.tasks?.created || 0) +
        (data.results?.tasks?.updated || 0)

      return {
        success: data.success,
        itemsSynced,
        errors: data.results?.errors
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-integration'] })
    }
  })

  // Update integration settings
  const updateSettingsMutation = useMutation<void, Error, Partial<GoogleIntegration>>({
    mutationFn: async (updates) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('integrations')
        .update(updates)
        .eq('user_id', user.id)
        .eq('provider', 'google')

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-integration'] })
    }
  })

  return {
    integration,
    isLoading,
    isConnected: integration?.status === 'active',
    connect: () => connectMutation.mutateAsync(),
    disconnect: () => disconnectMutation.mutateAsync(),
    sync: (projectId?: string) => syncMutation.mutateAsync({ projectId }),
    updateSettings: (settings: Partial<GoogleIntegration>) => updateSettingsMutation.mutateAsync(settings),
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isSyncing: syncMutation.isPending,
    isUpdatingSettings: updateSettingsMutation.isPending
  }
}

// Hook for checking if a specific Google service is available
export function useGoogleService(service: 'calendar' | 'tasks') {
  const { integration, isLoading } = useGoogleIntegration()

  const isAvailable = integration?.status === 'active' && 
    ((service === 'calendar' && integration.sync_calendar) ||
     (service === 'tasks' && integration.sync_tasks))

  return {
    isAvailable,
    isLoading,
    integration
  }
}

// Hook for Google sync status
export function useGoogleSyncStatus() {
  const queryClient = useQueryClient()
  
  const { data: syncLogs, isLoading } = useQuery({
    queryKey: ['google-sync-logs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .order('started_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data
    },
    refetchInterval: 60000 // Refetch every minute
  })

  const lastSync = syncLogs?.[0]
  const isCurrentlySyncing = lastSync?.status === 'started'
  
  return {
    syncLogs,
    isLoading,
    lastSync,
    isCurrentlySyncing
  }
}