import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Task, TimeSlot, Priority, Urgency, TaskStatus, TaskCategory } from '@/lib/types'

interface TaskStore {
  // Tasks
  tasks: Task[]
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  completeTask: (id: string) => void
  uncompleteTask: (id: string) => void
  moveTaskToTimeline: (taskId: string, date: Date, time: string) => void
  reorderTasks: (activeId: string, overId: string) => void
  
  // Timeline slots
  timeSlots: TimeSlot[]
  addTimeSlot: (slot: Omit<TimeSlot, 'id'>) => void
  removeTimeSlot: (id: string) => void
  updateTimeSlot: (id: string, updates: Partial<TimeSlot>) => void
  
  // Filters and sorting
  selectedCategory: TaskCategory | 'all'
  setSelectedCategory: (category: TaskCategory | 'all') => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  
  // Helpers
  getTasksByCategory: (category: TaskCategory | 'all') => Task[]
  getTasksForDate: (date: Date) => TimeSlot[]
  getUnscheduledTasks: () => Task[]
  getCompletedTasks: () => Task[]
  getAllActiveTasks: () => Task[]
  
  // Maintenance operations (placeholder for local store)
  removeDuplicateTasks: () => Promise<void>
  hideCompletedTask: (taskId: string) => void
  showCompletedTask: (taskId: string) => void
  clearHiddenCompletedTasks: () => void
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      // Initial state - 新規ユーザーは空のタスクリストから開始
      tasks: [],
      timeSlots: [],
      selectedCategory: 'all',
      searchQuery: '',

      // Actions
      addTask: (taskData) => {
        const newTask: Task = {
          ...taskData,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state) => ({ tasks: [...state.tasks, newTask] }))
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, ...updates, updatedAt: new Date() }
              : task
          )
        }))
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          timeSlots: state.timeSlots.filter((slot) => slot.taskId !== id)
        }))
      },

      completeTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, status: 'completed', completedAt: new Date(), updatedAt: new Date() }
              : task
          )
        }))
      },

      uncompleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, status: 'todo', completedAt: undefined, updatedAt: new Date() }
              : task
          )
        }))
      },

      moveTaskToTimeline: (taskId, date, time) => {
        const task = get().tasks.find((t) => t.id === taskId)
        if (!task) return

        const endTime = calculateEndTime(time, task.estimatedTime)
        
        const newSlot: TimeSlot = {
          id: Date.now().toString(),
          taskId,
          date,
          startTime: time,
          endTime,
          type: 'task'
        }

        set((state) => ({
          // 既存の同じタスクのスロットを削除してから新しいスロットを追加
          timeSlots: [...state.timeSlots.filter(slot => slot.taskId !== taskId), newSlot],
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, scheduledDate: date, scheduledTime: time }
              : t
          )
        }))
      },

      addTimeSlot: (slotData) => {
        const newSlot: TimeSlot = {
          ...slotData,
          id: Date.now().toString()
        }
        set((state) => ({ timeSlots: [...state.timeSlots, newSlot] }))
      },

      removeTimeSlot: (id) => {
        set((state) => {
          const slot = state.timeSlots.find((s) => s.id === id)
          if (slot?.taskId) {
            // Unschedule the task
            return {
              timeSlots: state.timeSlots.filter((s) => s.id !== id),
              tasks: state.tasks.map((t) =>
                t.id === slot.taskId
                  ? { ...t, scheduledDate: undefined, scheduledTime: undefined }
                  : t
              )
            }
          }
          return { timeSlots: state.timeSlots.filter((s) => s.id !== id) }
        })
      },

      updateTimeSlot: (id, updates) => {
        set((state) => ({
          timeSlots: state.timeSlots.map((slot) =>
            slot.id === id ? { ...slot, ...updates } : slot
          )
        }))
      },

      setSelectedCategory: (category) => {
        set({ selectedCategory: category })
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query })
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

      getAllActiveTasks: () => {
        return get().tasks.filter((task) => task.status !== 'completed')
      },

      reorderTasks: (activeId, overId) => {
        const { tasks } = get()
        
        // pool- プレフィックスを除去
        const actualActiveId = activeId.startsWith('pool-') ? activeId.substring(5) : activeId
        const actualOverId = overId.startsWith('pool-') ? overId.substring(5) : overId
        
        const activeIndex = tasks.findIndex((task) => task.id === actualActiveId)
        const overIndex = tasks.findIndex((task) => task.id === actualOverId)
        
        if (activeIndex === -1 || overIndex === -1) return
        
        const reorderedTasks = arrayMove(tasks, activeIndex, overIndex)
        set({ tasks: reorderedTasks })
      },

      // Maintenance operations (local store placeholder)
      removeDuplicateTasks: async () => {
        console.log('Duplicate removal not implemented for local store')
      },
      hideCompletedTask: (taskId: string) => {
        console.log('Hide completed task not implemented for local store:', taskId)
      },
      showCompletedTask: (taskId: string) => {
        console.log('Show completed task not implemented for local store:', taskId)
      },
      clearHiddenCompletedTasks: () => {
        console.log('Clear hidden completed tasks not implemented for local store')
      }
    }),
    {
      name: 'task-store',
      partialize: (state) => ({
        tasks: state.tasks,
        timeSlots: state.timeSlots
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const parsed = JSON.parse(str)
          // Convert date strings back to Date objects
          if (parsed.state?.tasks) {
            parsed.state.tasks = parsed.state.tasks.map((task: any) => ({
              ...task,
              // Convert old priority/urgency values to new 2-level system
              priority: task.priority === 'medium' ? 'low' : (task.priority || 'low'),
              urgency: task.urgency === 'urgent' || task.urgency === 'medium' ? 
                      (task.urgency === 'urgent' ? 'high' : 'low') : 
                      (task.urgency || 'low'),
              createdAt: task.createdAt ? new Date(task.createdAt) : undefined,
              updatedAt: task.updatedAt ? new Date(task.updatedAt) : undefined,
              completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
              scheduledDate: task.scheduledDate ? new Date(task.scheduledDate) : undefined
            }))
          }
          if (parsed.state?.timeSlots) {
            parsed.state.timeSlots = parsed.state.timeSlots.map((slot: any) => ({
              ...slot,
              date: slot.date ? new Date(slot.date) : new Date()
            }))
          }
          return parsed
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          localStorage.removeItem(name)
        }
      }
    }
  )
)

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