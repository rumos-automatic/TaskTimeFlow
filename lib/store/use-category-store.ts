import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CustomCategory, BuiltInCategory, BuiltInCategoryConfig, CategoryFilter, GoogleTasksSyncStatus } from '@/lib/types'

// Built-in category configurations
export const BUILT_IN_CATEGORIES: BuiltInCategoryConfig[] = [
  {
    id: 'work',
    name: '仕事',
    color: '#3B82F6', // Blue
    icon: '💼',
    description: '仕事関連のタスク',
    isBuiltIn: true,
    order: 0
  },
  {
    id: 'personal',
    name: '個人',
    color: '#10B981', // Green
    icon: '🏠',
    description: '個人的なタスク',
    isBuiltIn: true,
    order: 1
  },
  {
    id: 'google-tasks',
    name: 'Google Tasks',
    color: '#F59E0B', // Amber
    icon: '📋',
    description: 'Google Tasksから同期されたタスク',
    isBuiltIn: true,
    order: 2
  }
]

// Default colors for custom categories
export const CATEGORY_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#1F2937', // Dark gray
]

// Default icons for custom categories
export const CATEGORY_ICONS = [
  '📝', '🎯', '💡', '🔥', '⭐', '🚀', '💎', '🎨', '🔧', '📊',
  '🎵', '🏃', '📚', '🍕', '☕', '🌟', '🔮', '🎮', '🏆', '💰'
]

interface CategoryStore {
  // State
  customCategories: CustomCategory[]
  selectedCategory: CategoryFilter
  googleTasksSync: GoogleTasksSyncStatus
  loading: boolean
  error: string | null
  
  // Computed
  allCategories: (CustomCategory | BuiltInCategoryConfig)[]
  
  // Actions
  setSelectedCategory: (category: CategoryFilter) => void
  addCustomCategory: (category: Omit<CustomCategory, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => Promise<void>
  updateCustomCategory: (id: string, updates: Partial<CustomCategory>) => Promise<void>
  deleteCustomCategory: (id: string) => Promise<void>
  reorderCategories: (categories: CustomCategory[]) => Promise<void>
  
  // Google Tasks sync
  updateGoogleTasksSync: (status: Partial<GoogleTasksSyncStatus>) => void
  
  // Utility functions
  getCategoryById: (id: string) => CustomCategory | BuiltInCategoryConfig | undefined
  getCategoryByName: (name: string) => CustomCategory | BuiltInCategoryConfig | undefined
  getNextAvailableColor: () => string
  getNextAvailableIcon: () => string
  
  // Initialize and cleanup
  initialize: (userId: string) => Promise<void>
  cleanup: () => void
  
  // Internal
  setCustomCategories: (categories: CustomCategory[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set, get) => ({
      // Initial state
      customCategories: [],
      selectedCategory: 'all',
      googleTasksSync: {
        isEnabled: false,
        syncStatus: 'idle'
      },
      loading: false,
      error: null,
      
      // Computed properties
      get allCategories() {
        const { customCategories } = get()
        const sortedCustom = [...customCategories].sort((a, b) => a.order - b.order)
        const allCats = [...BUILT_IN_CATEGORIES, ...sortedCustom]
        console.log('📂 getAllCategories called:', { 
          customCategories, 
          sortedCustom, 
          builtIn: BUILT_IN_CATEGORIES,
          total: allCats 
        })
        return allCats
      },
      
      // Actions
      setSelectedCategory: (category) => {
        set({ selectedCategory: category })
      },
      
      addCustomCategory: async (categoryData) => {
        try {
          set({ loading: true, error: null })
          
          const { customCategories } = get()
          const newOrder = Math.max(...customCategories.map(c => c.order), BUILT_IN_CATEGORIES.length - 1) + 1
          
          const newCategory: CustomCategory = {
            ...categoryData,
            id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            order: newOrder,
            createdAt: new Date(),
            updatedAt: new Date()
          }
          
          // TODO: Save to Supabase when database integration is ready
          console.log('✅ Adding custom category (local only):', newCategory)
          
          set((state) => {
            const updatedCategories = [...state.customCategories, newCategory]
            console.log('✅ Updated customCategories:', updatedCategories)
            console.log('✅ All categories after add:', [...BUILT_IN_CATEGORIES, ...updatedCategories])
            return {
              customCategories: updatedCategories,
              loading: false
            }
          })
          
        } catch (error) {
          console.error('❌ Failed to add custom category:', error)
          set({ 
            error: 'カテゴリの追加に失敗しました',
            loading: false 
          })
        }
      },
      
      updateCustomCategory: async (id, updates) => {
        try {
          set({ loading: true, error: null })
          
          // TODO: Update in Supabase when database integration is ready
          console.log('Updating custom category (local only):', id, updates)
          
          set((state) => ({
            customCategories: state.customCategories.map((category) =>
              category.id === id
                ? { ...category, ...updates, updatedAt: new Date() }
                : category
            ),
            loading: false
          }))
          
        } catch (error) {
          console.error('Failed to update custom category:', error)
          set({ 
            error: 'カテゴリの更新に失敗しました',
            loading: false 
          })
        }
      },
      
      deleteCustomCategory: async (id) => {
        try {
          set({ loading: true, error: null })
          
          // TODO: Delete from Supabase when database integration is ready
          console.log('Deleting custom category (local only):', id)
          
          set((state) => ({
            customCategories: state.customCategories.filter((category) => category.id !== id),
            loading: false
          }))
          
        } catch (error) {
          console.error('Failed to delete custom category:', error)
          set({ 
            error: 'カテゴリの削除に失敗しました',
            loading: false 
          })
        }
      },
      
      reorderCategories: async (categories) => {
        try {
          // Update order based on array position
          const reorderedCategories = categories.map((category, index) => ({
            ...category,
            order: BUILT_IN_CATEGORIES.length + index,
            updatedAt: new Date()
          }))
          
          // TODO: Update order in Supabase when database integration is ready
          console.log('Reordering categories (local only):', reorderedCategories.map(c => c.name))
          
          set({ customCategories: reorderedCategories })
          
        } catch (error) {
          console.error('Failed to reorder categories:', error)
          set({ error: 'カテゴリの並び替えに失敗しました' })
        }
      },
      
      // Google Tasks sync
      updateGoogleTasksSync: (status) => {
        set((state) => ({
          googleTasksSync: { ...state.googleTasksSync, ...status }
        }))
      },
      
      // Utility functions
      getCategoryById: (id) => {
        const { allCategories } = get()
        return allCategories.find(category => category.id === id)
      },
      
      getCategoryByName: (name) => {
        const { allCategories } = get()
        return allCategories.find(category => category.name.toLowerCase() === name.toLowerCase())
      },
      
      getNextAvailableColor: () => {
        const { customCategories } = get()
        const usedColors = new Set([
          ...BUILT_IN_CATEGORIES.map(c => c.color),
          ...customCategories.map(c => c.color)
        ])
        
        return CATEGORY_COLORS.find(color => !usedColors.has(color)) || CATEGORY_COLORS[0]
      },
      
      getNextAvailableIcon: () => {
        const { customCategories } = get()
        const usedIcons = new Set([
          ...BUILT_IN_CATEGORIES.map(c => c.icon),
          ...customCategories.map(c => c.icon).filter(Boolean)
        ])
        
        return CATEGORY_ICONS.find(icon => !usedIcons.has(icon)) || CATEGORY_ICONS[0]
      },
      
      // Initialize
      initialize: async (userId: string) => {
        try {
          set({ loading: true, error: null })
          
          // TODO: Load custom categories from Supabase when database integration is ready
          console.log('Initializing category store for user:', userId)
          
          // For now, just clear loading state
          set({ loading: false })
          
        } catch (error) {
          console.error('Failed to initialize category store:', error)
          set({ 
            error: 'カテゴリデータの読み込みに失敗しました',
            loading: false 
          })
        }
      },
      
      cleanup: () => {
        console.log('Cleaning up category store')
        set({
          customCategories: [],
          selectedCategory: 'all',
          googleTasksSync: { isEnabled: false, syncStatus: 'idle' },
          loading: false,
          error: null
        })
      },
      
      // Internal state management
      setCustomCategories: (categories) => set({ customCategories: categories }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error })
    }),
    {
      name: 'category-store',
      partialize: (state) => ({
        // Only persist custom categories and settings, not built-in categories
        customCategories: state.customCategories,
        selectedCategory: state.selectedCategory,
        googleTasksSync: state.googleTasksSync
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          console.log('📖 Reading from localStorage:', name, str)
          if (!str) return null
          const parsed = JSON.parse(str)
          
          // Convert date strings back to Date objects
          if (parsed.state?.customCategories) {
            parsed.state.customCategories = parsed.state.customCategories.map((category: any) => ({
              ...category,
              createdAt: category.createdAt ? new Date(category.createdAt) : new Date(),
              updatedAt: category.updatedAt ? new Date(category.updatedAt) : new Date()
            }))
          }
          
          console.log('📖 Parsed localStorage data:', parsed)
          return parsed
        },
        setItem: (name, value) => {
          console.log('💾 Saving to localStorage:', name, value)
          localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          localStorage.removeItem(name)
        }
      }
    }
  )
)

// Hook for easy category management with auth integration
export function useCategoryStoreWithAuth() {
  const store = useCategoryStore()
  
  // You can add auth-specific logic here when needed
  // For example, automatic initialization when user logs in
  
  return store
}