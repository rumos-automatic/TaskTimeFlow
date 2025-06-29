import { create } from 'zustand'
import { Task, TimeSlot, Priority, Urgency, TaskStatus, TaskCategory } from '@/lib/types'
import { shouldGenerateTaskForDate, createTaskInstance, calculateNextOccurrence } from '@/lib/utils/recurring-tasks'
import { TaskService } from '@/lib/supabase/task-service'

interface SupabaseTaskStore {
  // State
  tasks: Task[]
  timeSlots: TimeSlot[]
  loading: boolean
  error: string | null
  syncing: boolean
  currentUserId: string | null
  
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
  
  // Recurring task operations
  generateRecurringTasks: (userId: string, targetDate?: Date) => Promise<void>
  
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
  let pauseTimeSlotUpdates = false // タイムスロット更新の競合を防ぐ

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
    currentUserId: null,
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
        set({ loading: true, error: null, currentUserId: userId })
        
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
            // タイムスロット更新中はリアルタイム更新を一時停止
            if (pauseTimeSlotUpdates) {
              console.log('🕒 Pausing time slot real-time update during optimistic update')
              return
            }
            
            console.log('🕒 Real-time time slots update received:', timeSlots.length)
            
            // 重複チェック：TimeSlot IDでユニーク化
            const uniqueTimeSlots = timeSlots.filter((slot, index, self) => 
              index === self.findIndex(s => s.id === slot.id)
            )
            
            if (uniqueTimeSlots.length !== timeSlots.length) {
              console.warn('Duplicate time slots detected and removed:', timeSlots.length - uniqueTimeSlots.length)
            }
            
            // 楽観的更新と競合しないように、一時的なスロットを保持
            set((state) => {
              const tempSlots = state.timeSlots.filter(slot => slot.id.startsWith('temp-'))
              const finalSlots = [...tempSlots, ...uniqueTimeSlots]
              console.log('🕒 Updated time slots (temp + real):', tempSlots.length, '+', uniqueTimeSlots.length, '=', finalSlots.length)
              return { timeSlots: finalSlots }
            })
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
        syncing: false,
        currentUserId: null
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
      try {
        // タスクを完了状態に更新
        await get().updateTask(id, { 
          status: 'completed', 
          completedAt: new Date() 
        })

        // 完了したタスクが繰り返しタスクの場合、次のインスタンスを生成
        const completedTask = get().tasks.find(t => t.id === id)
        if (completedTask && completedTask.isRecurring && completedTask.recurrenceType !== 'none') {
          console.log('🔄 繰り返しタスクを完了:', completedTask.title)
          
          // 次の発生日を計算
          const nextDate = calculateNextOccurrence(completedTask, new Date())
          if (nextDate) {
            console.log('📅 次の発生日:', nextDate.toLocaleDateString('ja-JP'))
            
            // 今後30日以内の場合のみ生成（無限生成を防ぐ）
            const thirtyDaysFromNow = new Date()
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
            
            if (nextDate <= thirtyDaysFromNow) {
              // 既に同じ日付のインスタンスが存在しないかチェック
              const existingInstance = get().tasks.find(task => 
                task.parentRecurringTaskId === completedTask.id &&
                task.scheduledDate &&
                task.scheduledDate.toDateString() === nextDate.toDateString()
              )
              
              if (!existingInstance) {
                const currentUserId = get().currentUserId
                if (!currentUserId) {
                  console.error('User ID not found in store')
                  return
                }
                
                // 次のタスクインスタンスを作成
                const nextTaskData = createTaskInstance(completedTask, nextDate, currentUserId)
                
                // addTaskメソッドを使用
                const { addTask } = get()
                await addTask(nextTaskData, currentUserId)
                console.log('✅ 次の繰り返しタスクを生成しました')
              } else {
                console.log('⏭️ この日付のタスクは既に存在します')
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to complete task:', error)
        set({ 
          error: 'タスクの完了に失敗しました',
          syncing: false 
        })
      }
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
        
        // リアルタイム更新を一時停止
        pauseTimeSlotUpdates = true
        console.log('⏸️ Paused time slot real-time updates for move operation')
        
        const task = get().tasks.find((t) => t.id === taskId)
        if (!task) {
          console.error('❌ Task not found:', taskId)
          return
        }

        console.log('📋 Found task to schedule:', task.title)
        const endTime = calculateEndTime(time, task.estimatedTime)
        console.log('⏰ Calculated time slot:', { time, endTime, duration: task.estimatedTime })
        
        // 既存のスロットを特定（楽観的更新前に）
        const existingSlots = get().timeSlots.filter(slot => slot.taskId === taskId)
        console.log('🔍 Existing slots before update:', existingSlots.length, existingSlots.map(s => ({ id: s.id, time: s.startTime })))
        
        // 楽観的更新：即座にUIを更新
        const tempSlotId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const optimisticSlot: TimeSlot = {
          id: tempSlotId,
          taskId,
          date,
          startTime: time,
          endTime,
          type: 'task'
        }
        
        console.log('⚡ Optimistic update: Replacing slots with temporary slot')
        console.log('⚡ Old slots to remove:', existingSlots.map(s => ({ id: s.id, time: s.startTime })))
        console.log('⚡ New temporary slot:', { id: tempSlotId, time, endTime })
        
        set((state) => ({
          // 既存のスロットを削除してから新しいスロットを追加
          timeSlots: [
            ...state.timeSlots.filter(slot => slot.taskId !== taskId),
            optimisticSlot
          ],
          // タスクにスケジュール情報を設定
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, scheduledDate: date, scheduledTime: time }
              : t
          )
        }))
        
        console.log('⚡ State after optimistic update:', {
          timeSlotsCount: get().timeSlots.length,
          taskSlots: get().timeSlots.filter(s => s.taskId === taskId).map(s => ({ id: s.id, time: s.startTime }))
        })
        
        // データベースから既存のスロットを削除
        console.log('🗑️ Removing existing slots from database:', existingSlots.length)
        for (const slot of existingSlots) {
          console.log('🗑️ Deleting slot:', { id: slot.id, time: slot.startTime })
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
        
        // 楽観的更新を実際のデータで置き換え
        console.log('🔄 Replacing optimistic update with real data')
        set((state) => ({
          timeSlots: [
            ...state.timeSlots.filter(slot => slot.id !== tempSlotId),
            createdSlot
          ]
        }))
        
        console.log('🎉 Successfully moved task to timeline')
        
        // 少し待ってからリアルタイム更新を再開
        setTimeout(() => {
          pauseTimeSlotUpdates = false
          console.log('▶️ Resumed time slot real-time updates')
        }, 500)
        
        set({ syncing: false })
        
      } catch (error) {
        console.error('❌ Failed to move task to timeline:', error)
        
        // エラー時はリアルタイム更新を即座に再開
        pauseTimeSlotUpdates = false
        console.log('▶️ Resumed time slot real-time updates (error case)')
        
        // エラー時は楽観的更新をロールバック
        console.log('🔄 Rolling back optimistic update')
        set((state) => ({
          timeSlots: state.timeSlots.filter(slot => !slot.id.startsWith('temp-')),
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, scheduledDate: undefined, scheduledTime: undefined }
              : t
          )
        }))
        
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
        console.log('🗑️ removeTimeSlot called:', id)
        set({ syncing: true, error: null })
        
        const slot = get().timeSlots.find((s) => s.id === id)
        if (!slot) {
          console.error('❌ Time slot not found:', id)
          return
        }
        
        console.log('🗑️ Found slot to remove:', slot)
        
        // 楽観的更新：即座にUIを更新
        console.log('⚡ Optimistic update: Removing time slot')
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
        
        // データベースから削除
        await TaskService.deleteTimeSlot(id)
        console.log('✅ Time slot deleted from database:', id)
        
        // Update task if it was scheduled
        if (slot?.taskId) {
          console.log('📝 Updating task to remove schedule info')
          await get().updateTask(slot.taskId, {
            scheduledDate: undefined,
            scheduledTime: undefined
          })
        }
        
        console.log('🎉 Successfully removed time slot')
        set({ syncing: false })
        
      } catch (error) {
        console.error('❌ Failed to remove time slot:', error)
        
        // エラー時は楽観的更新をロールバック
        console.log('🔄 Rolling back optimistic update')
        // リアルタイムサブスクリプションが正しい状態に戻してくれるので、ここでは特別な処理は不要
        
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

    // 繰り返しタスクの生成
    generateRecurringTasks: async (userId: string, targetDate: Date = new Date()) => {
      try {
        set((state) => ({ ...state, syncing: true }))
        
        const { tasks } = get()
        const recurringTasks = tasks.filter(task => task.isRecurring)
        
        const tasksToGenerate: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = []
        
        for (const recurringTask of recurringTasks) {
          if (shouldGenerateTaskForDate(recurringTask, targetDate)) {
            // 既に同じ日付に同じ親タスクのインスタンスが存在するかチェック
            const existingInstance = tasks.find(task => 
              task.parentRecurringTaskId === recurringTask.id &&
              task.scheduledDate &&
              new Date(task.scheduledDate).toDateString() === targetDate.toDateString()
            )
            
            if (!existingInstance) {
              const taskInstance = createTaskInstance(recurringTask, targetDate, userId)
              tasksToGenerate.push(taskInstance)
            }
          }
        }
        
        // 生成するタスクがある場合はデータベースに追加
        for (const taskData of tasksToGenerate) {
          await TaskService.createTask(taskData, userId)
        }
        
        console.log(`Generated ${tasksToGenerate.length} recurring tasks for ${targetDate.toDateString()}`)
        
      } catch (error) {
        console.error('Error generating recurring tasks:', error)
        set((state) => ({ 
          ...state, 
          error: error instanceof Error ? error.message : 'Failed to generate recurring tasks'
        }))
      } finally {
        set((state) => ({ ...state, syncing: false }))
      }
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