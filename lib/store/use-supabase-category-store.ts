'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import { CustomCategory, GoogleTasksSyncStatus } from '@/lib/types'
import { Database } from '@/lib/database.types'

type CustomCategoryRow = Database['public']['Tables']['custom_categories']['Row']
type CustomCategoryInsert = Database['public']['Tables']['custom_categories']['Insert']
type CustomCategoryUpdate = Database['public']['Tables']['custom_categories']['Update']

// Convert DB row to CustomCategory
function dbCategoryToCustomCategory(row: CustomCategoryRow): CustomCategory {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon || '',
    description: row.description || '',
    isBuiltIn: row.is_built_in ?? false,
    userId: row.user_id,
    order: row.order ?? 0,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
  }
}

interface SupabaseCategoryStore {
  // State
  customCategories: CustomCategory[]
  googleTasksSync: GoogleTasksSyncStatus
  loading: boolean
  syncing: boolean
  error: string | null
  initialized: boolean
  
  // Actions
  initialize: (userId: string) => Promise<void>
  cleanup: () => void
  
  // Category CRUD
  addCustomCategory: (category: Omit<CustomCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CustomCategory>
  updateCustomCategory: (id: string, updates: Partial<Omit<CustomCategory, 'id' | 'userId' | 'createdAt'>>) => Promise<void>
  deleteCustomCategory: (id: string) => Promise<void>
  reorderCategories: (categories: CustomCategory[]) => Promise<void>
  
  // Google Tasks sync
  updateGoogleTasksSync: (status: Partial<GoogleTasksSyncStatus>) => void
  
  // Internal state management
  setCustomCategories: (categories: CustomCategory[]) => void
  setLoading: (loading: boolean) => void
  setSyncing: (syncing: boolean) => void
  setError: (error: string | null) => void
}


// Convert CustomCategory to Supabase insert
const customCategoryToSupabaseInsert = (category: Omit<CustomCategory, 'id' | 'createdAt' | 'updatedAt'>): CustomCategoryInsert => ({
  name: category.name,
  color: category.color,
  icon: category.icon || null,
  description: category.description || null,
  is_built_in: category.isBuiltIn,
  user_id: category.userId,
  order: category.order
})

// Convert partial updates to Supabase update
const customCategoryToSupabaseUpdate = (updates: Partial<Omit<CustomCategory, 'id' | 'userId' | 'createdAt'>>): CustomCategoryUpdate => ({
  ...(updates.name && { name: updates.name }),
  ...(updates.color && { color: updates.color }),
  ...(updates.icon !== undefined && { icon: updates.icon || null }),
  ...(updates.description !== undefined && { description: updates.description || null }),
  ...(updates.isBuiltIn !== undefined && { is_built_in: updates.isBuiltIn }),
  ...(updates.order !== undefined && { order: updates.order }),
  updated_at: new Date().toISOString()
})

export const useSupabaseCategoryStore = create<SupabaseCategoryStore>((set, get) => ({
  // Initial state
  customCategories: [],
  googleTasksSync: {
    isEnabled: false,
    syncStatus: 'idle'
  },
  loading: false,
  syncing: false,
  error: null,
  initialized: false,
  
  // Initialize
  initialize: async (userId: string) => {
    const { initialized, loading } = get()
    if (initialized || loading) return
    
    try {
      console.log('🔧 Initializing Supabase category store for user:', userId)
      set({ loading: true, error: null })
      
      // Fetch custom categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('custom_categories')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true })
      
      if (categoriesError) {
        console.error('❌ Failed to fetch custom categories:', categoriesError)
        throw categoriesError
      }
      
      const customCategories = (categoriesData || []).map(dbCategoryToCustomCategory)
      console.log('✅ Fetched custom categories:', customCategories)
      
      // Set up realtime subscription for custom_categories
      const categoriesChannel = supabase
        .channel(`custom_categories_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'custom_categories',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('📡 Realtime custom_categories change:', payload)
            handleRealtimeChange(payload)
          }
        )
        .subscribe()
      
      set({
        customCategories,
        loading: false,
        initialized: true
      })
      
      console.log('✅ Supabase category store initialized successfully')
      
    } catch (error) {
      console.error('❌ Failed to initialize Supabase category store:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize category store',
        loading: false
      })
    }
  },
  
  // Cleanup
  cleanup: () => {
    console.log('🧹 Cleaning up Supabase category store')
    // Unsubscribe from realtime channels
    supabase.removeAllChannels()
    
    set({
      customCategories: [],
      googleTasksSync: { isEnabled: false, syncStatus: 'idle' },
      loading: false,
      syncing: false,
      error: null,
      initialized: false
    })
  },
  
  // Add custom category
  addCustomCategory: async (categoryData) => {
    try {
      set({ syncing: true, error: null })
      console.log('➕ Adding custom category to Supabase:', categoryData)
      
      // Calculate next order
      const { customCategories } = get()
      const nextOrder = customCategories.length > 0 
        ? Math.max(...customCategories.map(c => c.order)) + 1 
        : 0
      
      const insertData = customCategoryToSupabaseInsert({
        ...categoryData,
        order: nextOrder
      })
      
      console.log('➕ Insert data:', insertData)
      
      const { data, error } = await supabase
        .from('custom_categories')
        .insert(insertData)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Failed to add custom category:', error)
        throw error
      }
      
      const newCategory = dbCategoryToCustomCategory(data)
      console.log('✅ Custom category added successfully:', newCategory)
      
      // Update local state
      set((state) => ({
        customCategories: [...state.customCategories, newCategory].sort((a, b) => a.order - b.order),
        syncing: false
      }))
      
      return newCategory
      
    } catch (error) {
      console.error('❌ Failed to add custom category:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to add category',
        syncing: false
      })
      throw error
    }
  },
  
  // Update custom category
  updateCustomCategory: async (id, updates) => {
    try {
      set({ syncing: true, error: null })
      console.log('✏️ Updating custom category in Supabase:', id, updates)
      
      const updateData = customCategoryToSupabaseUpdate(updates)
      const { error } = await supabase
        .from('custom_categories')
        .update(updateData)
        .eq('id', id)
      
      if (error) {
        console.error('❌ Failed to update custom category:', error)
        throw error
      }
      
      console.log('✅ Custom category updated successfully')
      
      // Update local state
      set((state) => ({
        customCategories: state.customCategories.map((category) =>
          category.id === id
            ? { ...category, ...updates, updatedAt: new Date() }
            : category
        ).sort((a, b) => a.order - b.order),
        syncing: false
      }))
      
    } catch (error) {
      console.error('❌ Failed to update custom category:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to update category',
        syncing: false
      })
      throw error
    }
  },
  
  // Delete custom category
  deleteCustomCategory: async (id) => {
    try {
      set({ syncing: true, error: null })
      console.log('🗑️ Deleting custom category from Supabase:', id)
      
      const { error } = await supabase
        .from('custom_categories')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('❌ Failed to delete custom category:', error)
        throw error
      }
      
      console.log('✅ Custom category deleted successfully')
      
      // Update local state
      set((state) => ({
        customCategories: state.customCategories.filter(category => category.id !== id),
        syncing: false
      }))
      
    } catch (error) {
      console.error('❌ Failed to delete custom category:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to delete category',
        syncing: false
      })
      throw error
    }
  },
  
  // Reorder categories
  reorderCategories: async (categories) => {
    try {
      set({ syncing: true, error: null })
      console.log('🔄 Reordering categories in Supabase:', categories.map(c => c.name))
      
      // Update order in batch
      const updates = categories.map((category, index) => ({
        id: category.id,
        order: index,
        updated_at: new Date().toISOString()
      }))
      
      for (const update of updates) {
        const { error } = await supabase
          .from('custom_categories')
          .update({ order: update.order, updated_at: update.updated_at })
          .eq('id', update.id)
        
        if (error) {
          console.error('❌ Failed to update category order:', error)
          throw error
        }
      }
      
      console.log('✅ Categories reordered successfully')
      
      // Update local state
      const reorderedCategories = categories.map((category, index) => ({
        ...category,
        order: index,
        updatedAt: new Date()
      }))
      
      set({
        customCategories: reorderedCategories,
        syncing: false
      })
      
    } catch (error) {
      console.error('❌ Failed to reorder categories:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to reorder categories',
        syncing: false
      })
      throw error
    }
  },
  
  // Google Tasks sync
  updateGoogleTasksSync: (status) => {
    set((state) => ({
      googleTasksSync: { ...state.googleTasksSync, ...status }
    }))
  },
  
  // Internal state management
  setCustomCategories: (categories) => set({ customCategories: categories }),
  setLoading: (loading) => set({ loading }),
  setSyncing: (syncing) => set({ syncing }),
  setError: (error) => set({ error })
}))

// Handle realtime changes
const handleRealtimeChange = (payload: any) => {
  const { eventType, new: newRecord, old: oldRecord } = payload
  
  const store = useSupabaseCategoryStore.getState()
  
  switch (eventType) {
    case 'INSERT':
      if (newRecord) {
        const newCategory = dbCategoryToCustomCategory(newRecord)
        store.setCustomCategories([...store.customCategories, newCategory].sort((a, b) => a.order - b.order))
        console.log('📡 Realtime: Category added', newCategory)
      }
      break
      
    case 'UPDATE':
      if (newRecord) {
        const updatedCategory = dbCategoryToCustomCategory(newRecord)
        store.setCustomCategories(
          store.customCategories.map(category =>
            category.id === updatedCategory.id ? updatedCategory : category
          ).sort((a, b) => a.order - b.order)
        )
        console.log('📡 Realtime: Category updated', updatedCategory)
      }
      break
      
    case 'DELETE':
      if (oldRecord) {
        store.setCustomCategories(store.customCategories.filter(category => category.id !== oldRecord.id))
        console.log('📡 Realtime: Category deleted', oldRecord.id)
      }
      break
  }
}