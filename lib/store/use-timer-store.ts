import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TimerStore {
  // Timer state
  isRunning: boolean
  isPaused: boolean
  timeRemaining: number // in seconds
  totalTime: number // in seconds
  currentTaskId: string | null
  completedPomodoros: number
  isBreak: boolean // Track if currently in break mode
  
  // Timer settings
  pomodoroTime: number // in minutes
  breakTime: number // in minutes
  longBreakTime: number // in minutes
  
  // Actions
  startTimer: (taskId?: string) => void
  pauseTimer: () => void
  resumeTimer: () => void
  stopTimer: () => void
  resetTimer: () => void
  tick: () => void
  completePomodoro: () => void
  completeBreak: () => void
  
  // Settings
  updateTimerSettings: (settings: Partial<{
    pomodoroTime: number
    breakTime: number
    longBreakTime: number
  }>) => void
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isRunning: false,
      isPaused: false,
      timeRemaining: 25 * 60, // 25 minutes
      totalTime: 25 * 60,
      currentTaskId: null,
      completedPomodoros: 0,
      isBreak: false,
      
      // Default settings
      pomodoroTime: 25,
      breakTime: 5,
      longBreakTime: 15,
      
      // Actions
      startTimer: (taskId) => {
        const { pomodoroTime, isBreak, timeRemaining, totalTime } = get()
        
        // If in break mode, use the already set break time
        // Otherwise, use pomodoro time
        const time = isBreak ? totalTime : pomodoroTime * 60
        
        set({
          isRunning: true,
          isPaused: false,
          timeRemaining: isBreak ? timeRemaining : time,
          totalTime: time,
          currentTaskId: taskId || null
        })
      },
      
      pauseTimer: () => {
        set({ isPaused: true, isRunning: false })
      },
      
      resumeTimer: () => {
        set({ isPaused: false, isRunning: true })
      },
      
      stopTimer: () => {
        const { pomodoroTime } = get()
        set({
          isRunning: false,
          isPaused: false,
          timeRemaining: pomodoroTime * 60,
          totalTime: pomodoroTime * 60,
          currentTaskId: null,
          isBreak: false // Reset break mode when stopping
        })
      },
      
      resetTimer: () => {
        const { pomodoroTime } = get()
        set({
          timeRemaining: pomodoroTime * 60,
          totalTime: pomodoroTime * 60
        })
      },
      
      tick: () => {
        const { timeRemaining, isRunning, isBreak } = get()
        if (isRunning && timeRemaining > 0) {
          set({ timeRemaining: timeRemaining - 1 })
        } else if (isRunning && timeRemaining === 0) {
          if (isBreak) {
            get().completeBreak()
          } else {
            get().completePomodoro()
          }
        }
      },
      
      completePomodoro: () => {
        const { completedPomodoros, breakTime, longBreakTime } = get()
        const newCompletedCount = completedPomodoros + 1
        const isLongBreak = newCompletedCount % 4 === 0
        const nextTime = isLongBreak ? longBreakTime : breakTime
        
        set({
          completedPomodoros: newCompletedCount,
          timeRemaining: nextTime * 60,
          totalTime: nextTime * 60,
          isRunning: false,
          currentTaskId: null,
          isBreak: true // Set break mode
        })
        
        // Play notification sound or show notification
        if (typeof window !== 'undefined' && 'Notification' in window) {
          new Notification('ポモドーロ完了！', {
            body: `${isLongBreak ? '長い' : '短い'}休憩を取りましょう`,
            icon: '/favicon.ico'
          })
        }
      },
      
      completeBreak: () => {
        const { pomodoroTime } = get()
        
        set({
          isBreak: false,
          timeRemaining: pomodoroTime * 60,
          totalTime: pomodoroTime * 60,
          isRunning: false
        })
        
        // Play notification sound or show notification
        if (typeof window !== 'undefined' && 'Notification' in window) {
          new Notification('休憩終了！', {
            body: '作業を再開しましょう',
            icon: '/favicon.ico'
          })
        }
      },
      
      updateTimerSettings: (settings) => {
        set(settings)
      }
    }),
    {
      name: 'timer-store',
      partialize: (state) => ({
        pomodoroTime: state.pomodoroTime,
        breakTime: state.breakTime,
        longBreakTime: state.longBreakTime,
        completedPomodoros: state.completedPomodoros
      })
    }
  )
)