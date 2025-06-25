import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Task, TimeSlot, Priority, TaskStatus, TaskCategory } from '@/lib/types'

interface TaskStore {
  // Tasks
  tasks: Task[]
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTaskToTimeline: (taskId: string, date: Date, time: string) => void
  
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
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      // Initial state
      tasks: [
        {
          id: '1',
          title: '新しいランディングページのデザイン',
          priority: 'high',
          category: 'work',
          estimatedTime: 120,
          status: 'todo',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          title: 'プルリクエストのレビュー',
          priority: 'medium',
          category: 'work',
          estimatedTime: 30,
          status: 'todo',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '3',
          title: '食料品の買い物',
          priority: 'low',
          category: 'personal',
          estimatedTime: 60,
          status: 'todo',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
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
          timeSlots: [...state.timeSlots, newSlot],
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
        return get().tasks.filter((task) => !task.scheduledDate)
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