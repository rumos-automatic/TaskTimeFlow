import { create } from 'zustand'
import { Task, TimeSlot, Priority, Urgency, TaskStatus, TaskCategory } from '@/lib/types'
import { TaskService } from '@/lib/supabase/task-service'

interface SupabaseTaskStore {
  // State
  tasks: Task[]
  timeSlots: TimeSlot[]
  loading: boolean
  error: string | null
  syncing: boolean
  
  // Filters and sorting
  selectedCategory: TaskCategory | 'all'
  setSelectedCategory: (category: TaskCategory | 'all') => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  
  // Initialization
  initialize: (userId: string) => Promise<void>
  cleanup: () => void
  
  // Task operations
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, userId: string) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<void>
  uncompleteTask: (id: string) => Promise<void>
  reorderTasks: (activeId: string, overId: string) => void
  
  // Timeline operations
  moveTaskToTimeline: (taskId: string, date: Date, time: string, userId: string) => Promise<void>
  addTimeSlot: (slot: Omit<TimeSlot, 'id'>, userId: string) => Promise<void>
  removeTimeSlot: (id: string) => Promise<void>
  updateTimeSlot: (id: string, updates: Partial<TimeSlot>) => void
  
  // Helpers
  getTasksByCategory: (category: TaskCategory | 'all') => Task[]
  getTasksForDate: (date: Date) => TimeSlot[]
  getUnscheduledTasks: () => Task[]
  getCompletedTasks: () => Task[]
  
  // Maintenance operations
  removeDuplicateTasks: () => Promise<void>
  hideCompletedTask: (taskId: string) => void
  showCompletedTask: (taskId: string) => void
  clearHiddenCompletedTasks: () => void
  
  // Internal state management
  setTasks: (tasks: Task[]) => void
  setTimeSlots: (timeSlots: TimeSlot[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSyncing: (syncing: boolean) => void
}

export const useSupabaseTaskStore = create<SupabaseTaskStore>()((set, get) => {
  // Real-time subscription cleanup functions
  let unsubscribeTasks: (() => void) | null = null
  let unsubscribeTimeSlots: (() => void) | null = null
  let isInitialized = false
  let pauseRealTimeUpdates = false // 楽観的更新の競合を防ぐ

  // 非表示完了済みタスクの管理
  const getHiddenCompletedTasks = (): string[] => {
    try {
      const hidden = localStorage.getItem('hidden_completed_tasks')
      return hidden ? JSON.parse(hidden) : []
    } catch (error) {
      console.warn('Failed to get hidden completed tasks:', error)
      return []
    }
  }

  const setHiddenCompletedTasks = (taskIds: string[]) => {
    try {
      localStorage.setItem('hidden_completed_tasks', JSON.stringify(taskIds))
    } catch (error) {
      console.warn('Failed to set hidden completed tasks:', error)
    }
  }

  return {
    // Initial state
    tasks: [],
    timeSlots: [],
    loading: false,
    error: null,
    syncing: false,
    selectedCategory: 'all',
    searchQuery: '',

    // Filters
    setSelectedCategory: (category) => set({ selectedCategory: category }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    // Initialization
    initialize: async (userId: string) => {
      try {
        // Prevent duplicate initialization
        if (isInitialized) {
          console.log('Supabase store already initialized, skipping')
          return
        }
        
        console.log('Starting Supabase store initialization for user:', userId)
        isInitialized = true
        set({ loading: true, error: null })
        
        // Fetch initial data
        const [tasks, timeSlots] = await Promise.all([
          TaskService.getTasks(userId),
          TaskService.getTimeSlots(userId)
        ])
        
        console.log('Fetched initial data:', tasks.length, 'tasks,', timeSlots.length, 'time slots')
        console.log('Time slots data:', timeSlots)
        console.log('Tasks with schedule info:', tasks.filter(t => t.scheduledDate || t.scheduledTime))
        set({ tasks, timeSlots, loading: false })
        
        // Set up real-time subscriptions only if not already set up
        if (!unsubscribeTasks) {
          unsubscribeTasks = TaskService.subscribeToTasks(userId, (tasks) => {
            // 楽観的更新中はリアルタイム更新を一時停止
            if (pauseRealTimeUpdates) {
              console.log('Pausing real-time update during optimistic update')
              return
            }
            
            console.log('Real-time tasks update received:', tasks.length, 'tasks')
            console.log('Current tasks in store before update:', get().tasks.length)
            
            // 重複チェック：タスクIDでユニーク化
            const uniqueTasks = tasks.filter((task, index, self) => 
              index === self.findIndex(t => t.id === task.id)
            )
            
            if (uniqueTasks.length !== tasks.length) {
              console.warn('Duplicate tasks detected and removed:', tasks.length - uniqueTasks.length)
            }
            
            console.log('Setting tasks to store:', uniqueTasks.length, 'tasks')
            set({ tasks: uniqueTasks })
            console.log('Tasks in store after update:', get().tasks.length)
          })
        }
        
        if (!unsubscribeTimeSlots) {
          unsubscribeTimeSlots = TaskService.subscribeToTimeSlots(userId, (timeSlots) => {
            console.log('Real-time time slots update:', timeSlots.length)
            
            // 重複チェック：TimeSlot IDでユニーク化
            const uniqueTimeSlots = timeSlots.filter((slot, index, self) => 
              index === self.findIndex(s => s.id === slot.id)
            )
            
            if (uniqueTimeSlots.length !== timeSlots.length) {
              console.warn('Duplicate time slots detected and removed:', timeSlots.length - uniqueTimeSlots.length)
            }
            
            set({ timeSlots: uniqueTimeSlots })
          })
        }
        
      } catch (error) {
        console.error('Failed to initialize task store:', error)
        isInitialized = false
        
        // サブスクリプションのクリーンアップ（エラー時）
        if (unsubscribeTasks) {
          unsubscribeTasks()
          unsubscribeTasks = null
        }
        if (unsubscribeTimeSlots) {
          unsubscribeTimeSlots()
          unsubscribeTimeSlots = null
        }
        
        set({ 
          error: 'データの読み込みに失敗しました。再ログインしてください。',
          loading: false 
        })
      }
    },

    cleanup: () => {
      console.log('Cleaning up Supabase store')
      
      // Clean up subscriptions
      if (unsubscribeTasks) {
        unsubscribeTasks()
        unsubscribeTasks = null
      }
      if (unsubscribeTimeSlots) {
        unsubscribeTimeSlots()
        unsubscribeTimeSlots = null
      }
      
      // Reset initialization flag
      isInitialized = false
      
      // Reset state
      set({
        tasks: [],
        timeSlots: [],
        loading: false,
        error: null,
        syncing: false
      })
    },

    // Task operations
    addTask: async (taskData, userId) => {
      try {
        set({ syncing: true, error: null })
        
        const newTask = await TaskService.createTask(taskData, userId)
        
        // Optimistic update
        set((state) => ({
          tasks: [newTask, ...state.tasks],
          syncing: false
        }))
        
      } catch (error) {
        console.error('Failed to add task:', error)
        set({ 
          error: 'タスクの追加に失敗しました',
          syncing: false 
        })
      }
    },

    updateTask: async (id, updates) => {
      try {
        set({ syncing: true, error: null })
        
        // Optimistic update
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, ...updates, updatedAt: new Date() }
              : task
          )
        }))
        
        await TaskService.updateTask(id, updates)
        set({ syncing: false })
        
      } catch (error) {
        console.error('Failed to update task:', error)
        set({ 
          error: 'タスクの更新に失敗しました',
          syncing: false 
        })
        
        // Revert optimistic update on error
        // The real-time subscription will handle the correct state
      }
    },

    deleteTask: async (id) => {
      try {
        console.log('Deleting task:', id)
        const beforeTasks = get().tasks
        console.log('Tasks before delete:', beforeTasks.length, beforeTasks.map(t => t.id))
        
        set({ syncing: true, error: null })
        
        // リアルタイム更新を一時停止
        pauseRealTimeUpdates = true
        console.log('Paused real-time updates for delete operation')
        
        // 楽観的更新を即座に実行（UIの反応性向上）
        const filteredTasks = beforeTasks.filter((task) => task.id !== id)
        console.log('Filtered tasks:', filteredTasks.length)
        
        set((state) => ({
          tasks: filteredTasks,
          timeSlots: state.timeSlots.filter((slot) => slot.taskId !== id)
        }))
        
        console.log('Tasks after optimistic update:', get().tasks.length)
        
        // データベースから削除
        await TaskService.deleteTask(id)
        
        console.log('Task deleted successfully from database:', id)
        
        // 少し待ってからリアルタイム更新を再開
        setTimeout(() => {
          pauseRealTimeUpdates = false
          console.log('Resumed real-time updates')
        }, 500)
        
        set({ syncing: false })
        
      } catch (error) {
        console.error('Failed to delete task:', error)
        
        // エラー時はリアルタイム更新を即座に再開
        pauseRealTimeUpdates = false
        
        set({ 
          error: 'タスクの削除に失敗しました',
          syncing: false 
        })
      }
    },

    completeTask: async (id) => {
      await get().updateTask(id, { 
        status: 'completed', 
        completedAt: new Date() 
      })
    },

    uncompleteTask: async (id) => {
      await get().updateTask(id, { 
        status: 'todo', 
        completedAt: undefined 
      })
    },

    reorderTasks: (activeId, overId) => {
      const { tasks } = get()
      const activeIndex = tasks.findIndex((task) => task.id === activeId)
      const overIndex = tasks.findIndex((task) => task.id === overId)
      
      if (activeIndex === -1 || overIndex === -1) return
      
      const reorderedTasks = arrayMove(tasks, activeIndex, overIndex)
      set({ tasks: reorderedTasks })
      
      // Note: We don't persist task order to the database yet
      // This is just for UI reordering within the session
    },

    // Timeline operations
    moveTaskToTimeline: async (taskId, date, time, userId) => {
      try {
        console.log('🚀 moveTaskToTimeline called:', { taskId, date, time, userId })
        set({ syncing: true, error: null })
        
        const task = get().tasks.find((t) => t.id === taskId)
        if (!task) {
          console.error('❌ Task not found:', taskId)
          return
        }

        console.log('📋 Found task to schedule:', task.title)
        const endTime = calculateEndTime(time, task.estimatedTime)
        console.log('⏰ Calculated time slot:', { time, endTime, duration: task.estimatedTime })
        
        // Remove existing time slot for this task
        const existingSlots = get().timeSlots.filter(slot => slot.taskId === taskId)
        console.log('🗑️ Removing existing slots:', existingSlots.length)
        for (const slot of existingSlots) {
          await TaskService.deleteTimeSlot(slot.id)
        }
        
        // Create new time slot
        const newSlot: Omit<TimeSlot, 'id'> = {
          taskId,
          date,
          startTime: time,
          endTime,
          type: 'task'
        }
        
        console.log('📅 Creating new time slot:', newSlot)
        const createdSlot = await TaskService.createTimeSlot(newSlot, userId)
        console.log('✅ Time slot created:', createdSlot)
        
        // Update task with schedule info
        console.log('📝 Updating task with schedule info')
        await get().updateTask(taskId, {
          scheduledDate: date,
          scheduledTime: time
        })
        
        console.log('🎉 Successfully moved task to timeline')
        set({ syncing: false })
        
      } catch (error) {
        console.error('❌ Failed to move task to timeline:', error)
        set({ 
          error: 'タスクのスケジュール設定に失敗しました',
          syncing: false 
        })
      }
    },

    addTimeSlot: async (slotData, userId) => {
      try {
        set({ syncing: true, error: null })
        
        const newSlot = await TaskService.createTimeSlot(slotData, userId)
        
        // Optimistic update
        set((state) => ({
          timeSlots: [...state.timeSlots, newSlot],
          syncing: false
        }))
        
      } catch (error) {
        console.error('Failed to add time slot:', error)
        set({ 
          error: 'タイムスロットの追加に失敗しました',
          syncing: false 
        })
      }
    },

    removeTimeSlot: async (id) => {
      try {
        set({ syncing: true, error: null })
        
        const slot = get().timeSlots.find((s) => s.id === id)
        
        // Optimistic update
        set((state) => ({
          timeSlots: state.timeSlots.filter((s) => s.id !== id),
          tasks: slot?.taskId 
            ? state.tasks.map((t) =>
                t.id === slot.taskId
                  ? { ...t, scheduledDate: undefined, scheduledTime: undefined }
                  : t
              )
            : state.tasks
        }))
        
        await TaskService.deleteTimeSlot(id)
        
        // Update task if it was scheduled
        if (slot?.taskId) {
          await get().updateTask(slot.taskId, {
            scheduledDate: undefined,
            scheduledTime: undefined
          })
        }
        
        set({ syncing: false })
        
      } catch (error) {
        console.error('Failed to remove time slot:', error)
        set({ 
          error: 'タイムスロットの削除に失敗しました',
          syncing: false 
        })
      }
    },

    updateTimeSlot: (id, updates) => {
      set((state) => ({
        timeSlots: state.timeSlots.map((slot) =>
          slot.id === id ? { ...slot, ...updates } : slot
        )
      }))
    },

    // Helpers
    getTasksByCategory: (category) => {
      const tasks = get().tasks
      if (category === 'all') return tasks
      return tasks.filter((task) => task.category === category)
    },

    getTasksForDate: (date) => {
      return get().timeSlots.filter(
        (slot) => slot.date.toDateString() === date.toDateString()
      )
    },

    getUnscheduledTasks: () => {
      return get().tasks.filter((task) => !task.scheduledDate && task.status !== 'completed')
    },

    getCompletedTasks: () => {
      const hiddenIds = getHiddenCompletedTasks()
      return get().tasks.filter((task) => 
        task.status === 'completed' && !hiddenIds.includes(task.id)
      )
    },

    // Maintenance operations
    removeDuplicateTasks: async () => {
      try {
        console.log('Starting duplicate task removal process')
        set({ syncing: true, error: null })
        
        const allTasks = get().tasks
        console.log('Total tasks before duplicate removal:', allTasks.length)
        
        // Group tasks by title
        const tasksByTitle = new Map<string, Task[]>()
        
        allTasks.forEach(task => {
          const title = task.title.trim().toLowerCase()
          if (!tasksByTitle.has(title)) {
            tasksByTitle.set(title, [])
          }
          tasksByTitle.get(title)!.push(task)
        })
        
        const tasksToDelete: string[] = []
        
        // Find duplicates and mark older ones for deletion
        tasksByTitle.forEach((tasks, title) => {
          if (tasks.length > 1) {
            // Sort by creation date (newest first)
            tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            
            // Keep the newest, delete the rest
            const duplicates = tasks.slice(1)
            console.log(`Found ${duplicates.length} duplicates for "${title}":`, duplicates.map(t => t.id))
            
            duplicates.forEach(task => {
              tasksToDelete.push(task.id)
            })
          }
        })
        
        console.log(`Found ${tasksToDelete.length} duplicate tasks to remove`)
        
        if (tasksToDelete.length === 0) {
          console.log('No duplicate tasks found')
          set({ syncing: false })
          return
        }
        
        // Delete duplicates from database
        const deletePromises = tasksToDelete.map(id => TaskService.deleteTask(id))
        await Promise.all(deletePromises)
        
        console.log(`Successfully removed ${tasksToDelete.length} duplicate tasks`)
        set({ syncing: false })
        
      } catch (error) {
        console.error('Failed to remove duplicate tasks:', error)
        set({ 
          error: '重複タスクの削除に失敗しました',
          syncing: false 
        })
      }
    },

    // 完了済みタスクの非表示機能（削除せずプールから隠す）
    hideCompletedTask: (taskId: string) => {
      const hiddenIds = getHiddenCompletedTasks()
      if (!hiddenIds.includes(taskId)) {
        setHiddenCompletedTasks([...hiddenIds, taskId])
        console.log('Hidden completed task:', taskId)
      }
    },

    showCompletedTask: (taskId: string) => {
      const hiddenIds = getHiddenCompletedTasks()
      const updatedIds = hiddenIds.filter(id => id !== taskId)
      setHiddenCompletedTasks(updatedIds)
      console.log('Showed completed task:', taskId)
    },

    clearHiddenCompletedTasks: () => {
      setHiddenCompletedTasks([])
      console.log('Cleared all hidden completed tasks')
    },

    // Internal state management
    setTasks: (tasks) => set({ tasks }),
    setTimeSlots: (timeSlots) => set({ timeSlots }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setSyncing: (syncing) => set({ syncing })
  }
})

// Helper functions
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  return `${endHours.toString().padStart(2, '0')}:${endMinutes
    .toString()
    .padStart(2, '0')}`
}

function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const result = [...array]
  const [removed] = result.splice(from, 1)
  result.splice(to, 0, removed)
  return result
}