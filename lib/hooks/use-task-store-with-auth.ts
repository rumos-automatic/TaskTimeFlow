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

  // Check if the current user has previously used this browser for local data
  const checkUserLocalDataOwnership = (userId: string): boolean => {
    try {
      const userLocalDataKey = `user_local_data_${userId}`
      return localStorage.getItem(userLocalDataKey) === 'true'
    } catch (error) {
      console.warn('Failed to check user local data ownership:', error)
      return false
    }
  }
  
  // Check if this is a completely new user (first time using the app)
  const isNewUser = (userId: string): boolean => {
    try {
      const firstLoginKey = `first_login_completed_${userId}`
      return localStorage.getItem(firstLoginKey) !== 'true'
    } catch (error) {
      console.warn('Failed to check if new user:', error)
      return true // Assume new user for safety
    }
  }
  
  // Mark that the user has completed their first login
  const markFirstLoginCompleted = (userId: string) => {
    try {
      const firstLoginKey = `first_login_completed_${userId}`
      localStorage.setItem(firstLoginKey, 'true')
    } catch (error) {
      console.warn('Failed to mark first login completed:', error)
    }
  }

  // Mark that the current user has local data in this browser
  const markUserLocalDataOwnership = (userId: string) => {
    try {
      const userLocalDataKey = `user_local_data_${userId}`
      localStorage.setItem(userLocalDataKey, 'true')
    } catch (error) {
      console.warn('Failed to mark user local data ownership:', error)
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
      console.log('Checking migration eligibility for user:', user.id)

      // **重要**: 新しいユーザーのクロスコンタミネーション防止
      // このユーザーが過去にこのブラウザでローカルデータを作成していた証拠があるかチェック
      const hasUserLocalDataOwnership = checkUserLocalDataOwnership(user.id)
      
      // Get data from local store
      const localTasks = localStore.tasks
      const localTimeSlots = localStore.timeSlots

      console.log(`Local data found: ${localTasks.length} tasks, ${localTimeSlots.length} time slots`)
      console.log(`User ${user.id} has local data ownership: ${hasUserLocalDataOwnership}`)

      // ローカルデータがない場合は即座に完了マークを付ける
      if (localTasks.length === 0 && localTimeSlots.length === 0) {
        console.log('No local data to migrate')
        setMigrationStatus(user.id, true)
        setMigrating(false)
        return
      }

      // **新しい安全チェック**: ユーザーが過去にローカルデータを作成していない場合はマイグレーションしない
      if (!hasUserLocalDataOwnership) {
        console.log(`User ${user.id} has no local data ownership. Skipping migration to prevent cross-contamination.`)
        console.log('This prevents migrating other users\' local data to the current user\'s account.')
        setMigrationStatus(user.id, true)
        setMigrating(false)
        return
      }
      
      // **追加の安全チェック**: 新規ユーザーの場合は絶対にマイグレーションしない
      const newUser = isNewUser(user.id)
      if (newUser) {
        console.log(`⚠️  User ${user.id} is a new user. Absolutely no migration will be performed.`)
        console.log('New users start with a clean slate in Supabase.')
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

      console.log(`Starting migration of ${localTasks.length} tasks for verified user ${user.id}`)

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
      
      // 新規ユーザーチェック
      const newUser = isNewUser(user.id)
      if (newUser) {
        console.log('🆕 New user detected:', user.id)
        console.log('Clearing any existing local data to prevent cross-contamination')
        
        // ローカルストレージからタスクデータをクリア
        try {
          localStorage.removeItem('task-store')
          console.log('✅ Local task data cleared for new user')
        } catch (error) {
          console.error('Failed to clear local data:', error)
        }
        
        // 新規ユーザーとしてマーク
        markFirstLoginCompleted(user.id)
        setMigrationStatus(user.id, true) // マイグレーション不要
      }
      
      // 永続化されたマイグレーション状態を復元
      const alreadyMigrated = checkMigrationStatus(user.id)
      setMigrationCompleted(alreadyMigrated)
      console.log(`Migration status for user ${user.id}:`, alreadyMigrated)
      
      supabaseStore.initialize(user.id).then(() => {
        setInitialized(true)
        
        // **重要**: ユーザーがローカルデータを持っている場合は所有権マーカーを設定
        // これにより将来のマイグレーション判定が正確になる
        const localTasks = localStore.tasks
        if (localTasks.length > 0) {
          const hasOwnership = checkUserLocalDataOwnership(user.id)
          if (!hasOwnership) {
            console.warn(`⚠️  User ${user.id} is accessing local data (${localTasks.length} tasks) without ownership.`)
            console.warn('This may indicate local data from a different user. Migration will be skipped for safety.')
          } else {
            console.log(`✅ User ${user.id} has verified ownership of local data (${localTasks.length} tasks)`)
          }
          markUserLocalDataOwnership(user.id)
        } else {
          console.log(`User ${user.id} has no local data to migrate`)
        }
        
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

  // ローカルデータをクリアする関数（デバッグ用・管理用）
  const clearLocalData = () => {
    try {
      console.log('Clearing all local task data...')
      localStorage.removeItem('task-store')
      // Clear all user ownership markers
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('user_local_data_') || key.startsWith('migration_completed_')) {
          localStorage.removeItem(key)
        }
      })
      console.log('Local data cleared successfully')
      window.location.reload() // Reload to reset store state
    } catch (error) {
      console.error('Failed to clear local data:', error)
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
      resetMigrationStatus,
      clearLocalData
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