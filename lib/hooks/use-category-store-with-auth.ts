'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { useSupabaseCategoryStore } from '@/lib/store/use-supabase-category-store'
import { useCategoryStore as useLocalCategoryStore } from '@/lib/store/use-category-store'
import { CustomCategory, BuiltInCategoryConfig, CategoryFilter } from '@/lib/types'
import { BUILT_IN_CATEGORIES } from '@/lib/store/use-category-store'
import { supabase } from '@/lib/supabase/client'

export function useCategoryStoreWithAuth() {
  const { user, loading: authLoading } = useAuth()
  const supabaseStore = useSupabaseCategoryStore()
  const localStore = useLocalCategoryStore()
  const [migrationCompleted, setMigrationCompleted] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const initializingRef = useRef(false)

  // ユーザーIDベースでマイグレーション完了状態をチェック
  const checkMigrationStatus = (userId: string): boolean => {
    try {
      const migrationKey = `category_migration_completed_${userId}`
      const status = localStorage.getItem(migrationKey) === 'true'
      console.log(`📦 Migration status for user ${userId}:`, status)
      return status
    } catch (error) {
      console.warn('Failed to check category migration status:', error)
      return false
    }
  }

  // マイグレーション完了状態を永続化
  const setMigrationStatus = (userId: string, completed: boolean) => {
    try {
      const migrationKey = `category_migration_completed_${userId}`
      if (completed) {
        localStorage.setItem(migrationKey, 'true')
      } else {
        localStorage.removeItem(migrationKey)
      }
      setMigrationCompleted(completed)
    } catch (error) {
      console.warn('Failed to set category migration status:', error)
      setMigrationCompleted(completed)
    }
  }

  // ローカルデータをSupabaseに移行
  const migrateLocalDataToSupabase = useCallback(async () => {
    if (!user) return

    // 永続化されたマイグレーション状態をチェック
    const alreadyMigrated = checkMigrationStatus(user.id)
    if (alreadyMigrated) {
      console.log('📦 Category migration already completed for user:', user.id)
      setMigrationCompleted(true)
      return
    }

    console.log('🚀 Starting category migration for user:', user.id)
    setMigrating(true)

    try {
      // ローカルストレージからカスタムカテゴリを取得
      const localCustomCategories = localStore.customCategories
      console.log('📤 Local custom categories to migrate:', localCustomCategories)

      if (localCustomCategories.length > 0) {
        // Supabaseから最新データを直接取得して重複チェック
        const { data: existingData, error } = await supabase
          .from('custom_categories')
          .select('*')
          .eq('user_id', user.id)

        if (error) {
          console.error('❌ Failed to fetch existing categories:', error)
          throw error
        }

        const existingSupabaseCategories = existingData || []
        console.log('📥 Existing Supabase categories from DB:', existingSupabaseCategories)

        // ローカルデータをSupabaseに移行（厳密な重複チェック）
        for (const localCategory of localCustomCategories) {
          const exists = existingSupabaseCategories.some(
            (existing) => existing.name.toLowerCase() === localCategory.name.toLowerCase()
          )

          if (!exists) {
            console.log('➕ Migrating category to Supabase:', localCategory.name)
            await supabaseStore.addCustomCategory({
              ...localCategory,
              userId: user.id
            })
          } else {
            console.log('⏭️ Category already exists in Supabase, skipping:', localCategory.name)
          }
        }

        // 移行完了後、ローカルストレージをクリア
        localStore.setCustomCategories([])
        console.log('🧹 Cleared local custom categories after migration')
      }

      // マイグレーション完了をマーク
      setMigrationStatus(user.id, true)
      console.log('✅ Category migration completed successfully')

    } catch (error) {
      console.error('❌ Category migration failed:', error)
      // エラーが発生してもアプリの機能は継続する
    } finally {
      setMigrating(false)
    }
  }, [user, localStore, supabaseStore])

  // 初期化処理
  const initializeStores = useCallback(async () => {
    if (!user || authLoading || initialized || initializingRef.current) return

    initializingRef.current = true
    console.log('🔧 Initializing category stores for user:', user.id)

    try {
      // Supabaseストアを初期化
      await supabaseStore.initialize(user.id)
      
      // ローカルストアのユーザー設定も初期化
      await localStore.initialize(user.id)

      // データ移行を実行
      await migrateLocalDataToSupabase()

      setInitialized(true)
      console.log('✅ Category stores initialized successfully')

    } catch (error) {
      console.error('❌ Failed to initialize category stores:', error)
    } finally {
      initializingRef.current = false
    }
  }, [user, authLoading, initialized, supabaseStore, localStore, migrateLocalDataToSupabase])

  // クリーンアップ処理
  const cleanupStores = useCallback(() => {
    console.log('🧹 Cleaning up category stores')
    supabaseStore.cleanup()
    localStore.cleanup()
    setInitialized(false)
    setMigrationCompleted(false)
    setMigrating(false)
    initializingRef.current = false
  }, [supabaseStore, localStore])

  // ユーザー変更時の処理
  useEffect(() => {
    if (user) {
      initializeStores()
    } else {
      cleanupStores()
    }

    return () => {
      if (!user) {
        cleanupStores()
      }
    }
  }, [user, initializeStores, cleanupStores])

  // allCategoriesの計算
  const allCategories: (CustomCategory | BuiltInCategoryConfig)[] = [
    ...BUILT_IN_CATEGORIES,
    ...supabaseStore.customCategories.sort((a, b) => a.order - b.order)
  ]

  // 統合されたストア関数群
  return {
    // State
    customCategories: supabaseStore.customCategories,
    allCategories,
    selectedCategory: localStore.selectedCategory,
    googleTasksSync: supabaseStore.googleTasksSync,
    loading: supabaseStore.loading || authLoading,
    syncing: supabaseStore.syncing || migrating,
    error: supabaseStore.error || localStore.error,
    initialized,
    migrationCompleted,

    // Actions
    setSelectedCategory: localStore.setSelectedCategory,

    // Category management (Supabase)
    addCustomCategory: async (categoryData: Omit<CustomCategory, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
      if (!user) throw new Error('User not authenticated')
      
      console.log('🚀 useCategoryStoreWithAuth.addCustomCategory called with:', categoryData)
      console.log('🔍 Migration completed:', migrationCompleted)
      console.log('🔍 Initialized:', initialized)
      console.log('🔍 User:', user.id)
      
      if (!initialized) {
        console.warn('⚠️ Store not initialized, initializing now...')
        await initializeStores()
      }
      
      return supabaseStore.addCustomCategory({
        ...categoryData,
        userId: user.id
      })
    },

    updateCustomCategory: supabaseStore.updateCustomCategory,
    deleteCustomCategory: supabaseStore.deleteCustomCategory,
    reorderCategories: supabaseStore.reorderCategories,

    // Google Tasks sync
    updateGoogleTasksSync: supabaseStore.updateGoogleTasksSync,

    // Utility functions
    getCategoryById: (id: string) => {
      return allCategories.find(category => category.id === id)
    },

    getCategoryByName: (name: string) => {
      return allCategories.find(category => category.name.toLowerCase() === name.toLowerCase())
    },

    getNextAvailableColor: localStore.getNextAvailableColor,
    getNextAvailableIcon: localStore.getNextAvailableIcon,

    // Migration and cleanup
    resetMigrationStatus: () => {
      if (user) {
        console.log('🔄 Resetting migration status for user:', user.id)
        setMigrationStatus(user.id, false)
        setInitialized(false)
        setMigrationCompleted(false)
      }
    },

    forceRefresh: async () => {
      if (user && initialized) {
        await supabaseStore.initialize(user.id)
      }
    },

    // 重複カテゴリを削除する機能
    removeDuplicateCategories: async () => {
      if (!user) return
      
      console.log('🧹 Removing duplicate categories...')
      
      try {
        // Supabaseから全カテゴリを取得
        const { data: allCategories, error } = await supabase
          .from('custom_categories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
        
        if (error) {
          console.error('❌ Failed to fetch categories:', error)
          return
        }
        
        if (!allCategories) return
        
        const seen = new Set<string>()
        const duplicates: string[] = []
        
        // 重複をチェック（名前の大文字小文字を無視）
        for (const category of allCategories) {
          const lowerName = category.name.toLowerCase()
          if (seen.has(lowerName)) {
            duplicates.push(category.id)
            console.log('🗑️ Found duplicate category:', category.name, category.id)
          } else {
            seen.add(lowerName)
          }
        }
        
        // 重複を削除
        for (const duplicateId of duplicates) {
          await supabaseStore.deleteCustomCategory(duplicateId)
        }
        
        console.log(`✅ Removed ${duplicates.length} duplicate categories`)
        
      } catch (error) {
        console.error('❌ Failed to remove duplicates:', error)
      }
    },

    // Debug helper to fix current state
    debugAndFix: async () => {
      if (!user) return
      
      console.log('🔧 Debug and fix category store state...')
      console.log('Current state:', {
        user: user.id,
        initialized,
        migrationCompleted,
        customCategories: supabaseStore.customCategories.length,
        loading: supabaseStore.loading
      })
      
      // まず重複を削除
      try {
        const { data: allCategories, error } = await supabase
          .from('custom_categories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
        
        if (!error && allCategories) {
          const seen = new Set<string>()
          const duplicates: string[] = []
          
          for (const category of allCategories) {
            const lowerName = category.name.toLowerCase()
            if (seen.has(lowerName)) {
              duplicates.push(category.id)
            } else {
              seen.add(lowerName)
            }
          }
          
          for (const duplicateId of duplicates) {
            await supabaseStore.deleteCustomCategory(duplicateId)
          }
          
          console.log(`✅ Removed ${duplicates.length} duplicate categories`)
        }
      } catch (error) {
        console.error('❌ Failed to remove duplicates:', error)
      }
      
      // Reset migration status and re-initialize
      setMigrationStatus(user.id, false)
      setInitialized(false)
      setMigrationCompleted(false)
      
      // Force re-initialization
      await initializeStores()
    }
  }
}