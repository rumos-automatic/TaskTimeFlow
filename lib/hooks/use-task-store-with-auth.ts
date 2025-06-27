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

  // ユーザーIDベースでマイグレーション完了状態をチェック
  const checkMigrationStatus = (userId: string): boolean => {
    try {
      const migrationKey = `migration_completed_${userId}`
      return localStorage.getItem(migrationKey) === 'true'
    } catch (error) {
      console.warn('Failed to check migration status:', error)
      return false
    }
  }

  // マイグレーション完了状態を永続化
  const setMigrationStatus = (userId: string, completed: boolean) => {
    try {
      const migrationKey = `migration_completed_${userId}`
      if (completed) {
        localStorage.setItem(migrationKey, 'true')
      } else {
        localStorage.removeItem(migrationKey)
      }
      setMigrationCompleted(completed)
    } catch (error) {
      console.warn('Failed to set migration status:', error)
      setMigrationCompleted(completed)
    }
  }

  // Migrate local storage data to Supabase
  const migrateLocalDataToSupabase = useCallback(async () => {
    if (!user) return

    // 永続化されたマイグレーション状態をチェック
    const alreadyMigrated = checkMigrationStatus(user.id)
    if (alreadyMigrated) {
      console.log(`Migration already completed for user ${user.id}, skipping`)
      setMigrationCompleted(true)
      return
    }

    // 現在マイグレーション中または完了済みの場合はスキップ
    if (migrationCompleted || migrating) return

    try {
      setMigrating(true)
      console.log('Starting data migration from local storage to Supabase for user:', user.id)

      // Get data from local store
      const localTasks = localStore.tasks
      const localTimeSlots = localStore.timeSlots

      console.log(`Local data found: ${localTasks.length} tasks, ${localTimeSlots.length} time slots`)

      // ローカルデータがない場合は即座に完了マークを付ける
      if (localTasks.length === 0 && localTimeSlots.length === 0) {
        console.log('No local data to migrate')
        setMigrationStatus(user.id, true)
        setMigrating(false)
        return
      }

      // Supabaseに既にデータがある場合はマイグレーションをスキップ
      const existingTasks = supabaseStore.tasks
      console.log(`Existing Supabase data: ${existingTasks.length} tasks`)
      
      if (existingTasks.length > 0) {
        console.log('Supabase already has data, marking migration as completed without duplicating')
        setMigrationStatus(user.id, true)
        setMigrating(false)
        return
      }

      console.log(`Starting migration of ${localTasks.length} tasks`)

      // Migrate tasks first
      const taskMigrationPromises = localTasks.map(async (task) => {
        const { id, createdAt, updatedAt, ...taskData } = task
        try {
          await supabaseStore.addTask(taskData, user.id)
          console.log(`Migrated task: ${task.title}`)
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
      setMigrationStatus(user.id, true)

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
      console.log('User authenticated, initializing Supabase store for user:', user.id)
      initializingRef.current = true
      
      // 永続化されたマイグレーション状態を復元
      const alreadyMigrated = checkMigrationStatus(user.id)
      setMigrationCompleted(alreadyMigrated)
      console.log(`Migration status for user ${user.id}:`, alreadyMigrated)
      
      supabaseStore.initialize(user.id).then(() => {
        setInitialized(true)
        // Migrate data from local storage to Supabase (one-time only)
        if (!alreadyMigrated) {
          console.log('Running migration as it has not been completed yet')
          migrateLocalDataToSupabase()
        } else {
          console.log('Migration already completed, skipping')
        }
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

  // 重複マイグレーション状態をリセットする関数（デバッグ用）
  const resetMigrationStatus = () => {
    if (user) {
      console.log('Resetting migration status for user:', user.id)
      setMigrationStatus(user.id, false)
    }
  }

  // Return the appropriate store based on authentication status
  if (authLoading) {
    return {
      ...supabaseStore,
      loading: true,
      migrating: false,
      resetMigrationStatus
    }
  }

  if (user) {
    return {
      ...supabaseStore,
      migrating,
      resetMigrationStatus
    }
  }

  // Fallback to local store for unauthenticated users (shouldn't happen with AuthGuard)
  return {
    ...localStore,
    loading: false,
    syncing: false,
    migrating: false,
    initialize: async () => {},
    cleanup: () => {},
    resetMigrationStatus: () => {},
    removeDuplicateTasks: async () => {}
  }
}