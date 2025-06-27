'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { useSupabaseTaskStore } from '@/lib/store/use-supabase-task-store'
import { useTaskStore as useLocalTaskStore } from '@/lib/store/use-task-store'

export function useTaskStoreWithAuth() {
  const { user, loading: authLoading } = useAuth()
  const supabaseStore = useSupabaseTaskStore()
  const localStore = useLocalTaskStore()
  const [migrationCompleted, setMigrationCompleted] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const initializingRef = useRef(false)

  // Migrate local storage data to Supabase
  const migrateLocalDataToSupabase = useCallback(async () => {
    if (!user) return

    // 状態を直接確認（依存配列から除外）
    if (migrationCompleted || migrating) return

    try {
      setMigrating(true)
      console.log('Starting data migration from local storage to Supabase')

      // Get data from local store
      const localTasks = localStore.tasks
      const localTimeSlots = localStore.timeSlots

      if (localTasks.length === 0 && localTimeSlots.length === 0) {
        console.log('No local data to migrate')
        setMigrationCompleted(true)
        setMigrating(false)
        return
      }

      // Check if Supabase already has data (avoid duplicate migration)
      const existingTasks = supabaseStore.tasks
      if (existingTasks.length > 0) {
        console.log('Supabase already has data, skipping migration')
        setMigrationCompleted(true)
        setMigrating(false)
        return
      }

      console.log(`Migrating ${localTasks.length} tasks and ${localTimeSlots.length} time slots`)

      // Migrate tasks first
      const taskMigrationPromises = localTasks.map(async (task) => {
        const { id, createdAt, updatedAt, ...taskData } = task
        try {
          await supabaseStore.addTask(taskData, user.id)
        } catch (error) {
          console.error('Failed to migrate task:', task.title, error)
        }
      })

      await Promise.all(taskMigrationPromises)

      // Wait a bit for tasks to be created and get their new IDs
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Migrate time slots (this is more complex as we need to map old task IDs to new ones)
      // For now, we'll skip time slot migration and let users reschedule
      // TODO: Implement proper ID mapping for time slots

      console.log('Data migration completed successfully')
      setMigrationCompleted(true)

    } catch (error) {
      console.error('Data migration failed:', error)
    } finally {
      setMigrating(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]) // Zustandストアは安定しているためESLint警告を無効化

  // Initialize Supabase store when user is authenticated
  useEffect(() => {
    if (authLoading) return

    if (user && !initializingRef.current) {
      console.log('User authenticated, initializing Supabase store')
      initializingRef.current = true
      
      supabaseStore.initialize(user.id).then(() => {
        setInitialized(true)
        // Migrate data from local storage to Supabase (one-time)
        migrateLocalDataToSupabase()
      }).catch((error) => {
        console.error('Failed to initialize Supabase store:', error)
        initializingRef.current = false
      })
    } else if (!user) {
      console.log('User not authenticated, cleaning up Supabase store')
      supabaseStore.cleanup()
      setMigrationCompleted(false)
      setInitialized(false)
      initializingRef.current = false
    }

    // クリーンアップ関数を削除（メモリリークの原因となる可能性）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]) // Zustandストアと安定化された関数のためESLint警告を無効化

  // Return the appropriate store based on authentication status
  if (authLoading) {
    return {
      ...supabaseStore,
      loading: true,
      migrating: false
    }
  }

  if (user) {
    return {
      ...supabaseStore,
      migrating
    }
  }

  // Fallback to local store for unauthenticated users (shouldn't happen with AuthGuard)
  return {
    ...localStore,
    loading: false,
    syncing: false,
    migrating: false,
    initialize: async () => {},
    cleanup: () => {}
  }
}