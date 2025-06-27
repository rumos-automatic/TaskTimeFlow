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
        set({ loading: true, error: null })
        
        // Fetch initial data
        const [tasks, timeSlots] = await Promise.all([
          TaskService.getTasks(userId),
          TaskService.getTimeSlots(userId)
        ])
        
        set({ tasks, timeSlots, loading: false })
        
        // Set up real-time subscriptions
        unsubscribeTasks = TaskService.subscribeToTasks(userId, (tasks) => {
          console.log('Real-time tasks update received:', tasks.length, 'tasks')
          console.log('Current tasks in store:', get().tasks.length)
          set({ tasks })
        })
        
        unsubscribeTimeSlots = TaskService.subscribeToTimeSlots(userId, (timeSlots) => {
          console.log('Real-time time slots update:', timeSlots.length)
          set({ timeSlots })
        })
        
      } catch (error) {
        console.error('Failed to initialize task store:', error)
        set({ 
          error: 'データの読み込みに失敗しました',
          loading: false 
        })
      }
    },

    cleanup: () => {
      // Clean up subscriptions
      if (unsubscribeTasks) {
        unsubscribeTasks()
        unsubscribeTasks = null
      }
      if (unsubscribeTimeSlots) {
        unsubscribeTimeSlots()
        unsubscribeTimeSlots = null
      }
      
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
        
        // Optimistic update - 正しくフィルターする
        const filteredTasks = beforeTasks.filter((task) => task.id !== id)
        console.log('Filtered tasks:', filteredTasks.length, filteredTasks.map(t => t.id))
        
        set((state) => ({
          tasks: filteredTasks,
          timeSlots: state.timeSlots.filter((slot) => slot.taskId !== id),
          syncing: false
        }))
        
        console.log('Tasks after optimistic update:', get().tasks.length)
        
        // データベースから削除
        await TaskService.deleteTask(id)
        
        console.log('Task deleted successfully from database:', id)
        
      } catch (error) {
        console.error('Failed to delete task:', error)
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
        set({ syncing: true, error: null })
        
        const task = get().tasks.find((t) => t.id === taskId)
        if (!task) return

        const endTime = calculateEndTime(time, task.estimatedTime)
        
        // Remove existing time slot for this task
        const existingSlots = get().timeSlots.filter(slot => slot.taskId === taskId)
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
        
        const createdSlot = await TaskService.createTimeSlot(newSlot, userId)
        
        // Update task with schedule info
        await get().updateTask(taskId, {
          scheduledDate: date,
          scheduledTime: time
        })
        
        set({ syncing: false })
        
      } catch (error) {
        console.error('Failed to move task to timeline:', error)
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
      return get().tasks.filter((task) => task.status === 'completed')
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