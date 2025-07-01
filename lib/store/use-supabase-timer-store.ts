import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import { TaskService } from '@/lib/supabase/task-service'

interface SupabaseTimerStore {
  // Timer mode
  timerMode: 'pomodoro' | 'stopwatch'
  
  // Timer state
  isRunning: boolean
  isPaused: boolean
  timeRemaining: number // in seconds (for pomodoro)
  totalTime: number // in seconds (for pomodoro)
  stopwatchTime: number // in seconds (for stopwatch)
  currentTaskId: string | null
  completedPomodoros: number
  isBreak: boolean // Track if currently in break mode
  userId: string | null
  
  // Stopwatch interval tracking
  stopwatchInterval: number | null
  lastUpdateTime: number | null
  
  // Basic timer settings
  pomodoroTime: number // in minutes
  breakTime: number // in minutes
  longBreakTime: number // in minutes
  longBreakInterval: number // How many pomodoros before long break
  
  // Notification settings
  soundEnabled: boolean
  notificationEnabled: boolean
  customNotificationMessage: {
    pomodoroComplete: string
    breakComplete: string
  }
  
  // Automation settings
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  
  // Display settings
  timerColor: string
  displayMode: 'digital' | 'analog'
  
  // Animation settings
  gradientAnimation: boolean
  waveAnimation: boolean
  colorTransition: boolean
  
  // Actions
  setUserId: (userId: string | null) => void
  startTimer: (taskId?: string) => void
  pauseTimer: () => void
  resumeTimer: () => void
  stopTimer: () => void
  resetTimer: () => void
  tick: () => void
  completePomodoro: () => void
  completeBreak: () => void
  
  // Stopwatch actions
  startStopwatch: (taskId?: string) => void
  stopStopwatch: () => void
  resetStopwatch: () => void
  
  // Mode actions
  setTimerMode: (mode: 'pomodoro' | 'stopwatch') => void
  
  // Time tracking
  getTodayTotalTime: () => Promise<number>
  getTaskTotalTime: (taskId: string) => Promise<number>
  
  // Settings
  updateTimerSettings: (settings: Partial<{
    pomodoroTime: number
    breakTime: number
    longBreakTime: number
    longBreakInterval: number
    soundEnabled: boolean
    notificationEnabled: boolean
    customNotificationMessage: {
      pomodoroComplete: string
      breakComplete: string
    }
    autoStartBreaks: boolean
    autoStartPomodoros: boolean
    timerColor: string
    displayMode: 'digital' | 'analog'
    gradientAnimation: boolean
    waveAnimation: boolean
    colorTransition: boolean
  }>) => void
}

export const useSupabaseTimerStore = create<SupabaseTimerStore>((set, get) => ({
  // Initial state
  timerMode: 'stopwatch' as const,
  isRunning: false,
  isPaused: false,
  timeRemaining: 25 * 60,
  totalTime: 25 * 60,
  stopwatchTime: 0,
  currentTaskId: null,
  completedPomodoros: 0,
  isBreak: false,
  userId: null,
  
  // Stopwatch tracking
  stopwatchInterval: null,
  lastUpdateTime: null,
  
  // Basic timer settings
  pomodoroTime: 25,
  breakTime: 5,
  longBreakTime: 15,
  longBreakInterval: 4,
  
  // Notification settings
  soundEnabled: true,
  notificationEnabled: true,
  customNotificationMessage: {
    pomodoroComplete: 'ポモドーロ完了！休憩を取りましょう',
    breakComplete: '休憩終了！作業を再開しましょう'
  },
  
  // Automation settings
  autoStartBreaks: false,
  autoStartPomodoros: false,
  
  // Display settings
  timerColor: 'orange',
  displayMode: 'digital' as const,
  
  // Animation settings
  gradientAnimation: true,
  waveAnimation: false,
  colorTransition: true,
  
  // Actions
  setUserId: (userId) => {
    set({ userId })
  },
  
  startTimer: (taskId) => {
    const { pomodoroTime, isBreak, timeRemaining, totalTime } = get()
    
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
      isBreak: false
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
    const { timerMode, timeRemaining, isRunning, isBreak, stopwatchTime, currentTaskId, userId } = get()
    if (!isRunning) return
    
    if (timerMode === 'pomodoro') {
      if (timeRemaining > 0) {
        set({ timeRemaining: timeRemaining - 1 })
      } else if (timeRemaining === 0) {
        if (isBreak) {
          get().completeBreak()
        } else {
          get().completePomodoro()
        }
      }
    } else {
      // Stopwatch mode - handled by startStopwatch interval
    }
  },
  
  completePomodoro: () => {
    const { 
      completedPomodoros, 
      breakTime, 
      longBreakTime, 
      longBreakInterval,
      notificationEnabled,
      customNotificationMessage,
      autoStartBreaks
    } = get()
    
    const newCompletedCount = completedPomodoros + 1
    const isLongBreak = newCompletedCount % longBreakInterval === 0
    const nextTime = isLongBreak ? longBreakTime : breakTime
    
    set({
      completedPomodoros: newCompletedCount,
      timeRemaining: nextTime * 60,
      totalTime: nextTime * 60,
      isRunning: autoStartBreaks,
      currentTaskId: null,
      isBreak: true
    })
    
    if (notificationEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      new Notification('ポモドーロ完了！', {
        body: customNotificationMessage.pomodoroComplete,
        icon: '/favicon.ico'
      })
    }
  },
  
  completeBreak: () => {
    const { 
      pomodoroTime, 
      notificationEnabled, 
      customNotificationMessage,
      autoStartPomodoros
    } = get()
    
    set({
      isBreak: false,
      timeRemaining: pomodoroTime * 60,
      totalTime: pomodoroTime * 60,
      isRunning: autoStartPomodoros
    })
    
    if (notificationEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      new Notification('休憩終了！', {
        body: customNotificationMessage.breakComplete,
        icon: '/favicon.ico'
      })
    }
  },
  
  // Stopwatch actions
  startStopwatch: (taskId) => {
    const { userId, stopwatchInterval, isRunning } = get()
    if (!userId) {
      console.error('No user ID found, cannot start stopwatch')
      return
    }
    
    console.log(`Starting stopwatch for ${taskId ? `task ${taskId}` : 'general time'}`)
    
    // Clear any existing interval
    if (stopwatchInterval) {
      clearInterval(stopwatchInterval)
    }
    
    const startTime = Date.now()
    // Reset stopwatch time when starting fresh (not resuming)
    const initialTime = isRunning ? get().stopwatchTime : 0
    
    // Update every second
    const interval = setInterval(async () => {
      // Check if still running before updating
      const currentState = get()
      if (!currentState.isRunning) {
        clearInterval(interval)
        return
      }
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      set({ stopwatchTime: initialTime + elapsed })
      
      // Update Supabase every 5 seconds
      if (elapsed > 0 && elapsed % 5 === 0) {
        try {
          console.log(`Saving 5 seconds to Supabase for ${taskId ? `task ${taskId}` : 'general time'}`)
          await TaskService.updateTimeLog(userId, taskId || null, 5)
          // Update lastUpdateTime after successful save
          set({ lastUpdateTime: Date.now() })
          console.log('Time log updated successfully')
        } catch (error) {
          console.error('Error updating time log:', error)
        }
      }
    }, 1000)
    
    set({
      timerMode: 'stopwatch',
      isRunning: true,
      isPaused: false,
      currentTaskId: taskId || null,
      stopwatchInterval: interval as any,
      lastUpdateTime: Date.now()
    })
  },
  
  stopStopwatch: async () => {
    const { stopwatchInterval, userId, currentTaskId, lastUpdateTime, stopwatchTime } = get()
    
    if (stopwatchInterval) {
      clearInterval(stopwatchInterval)
      console.log('Stopwatch interval cleared')
    }
    
    // Save any remaining time since last update
    if (userId) {
      // Calculate remaining seconds that haven't been saved
      const currentTime = Date.now()
      const lastUpdate = lastUpdateTime || currentTime
      const remainingSeconds = Math.floor((currentTime - lastUpdate) / 1000)
      
      if (remainingSeconds > 0) {
        try {
          await TaskService.updateTimeLog(userId, currentTaskId, remainingSeconds)
          console.log(`Saved remaining ${remainingSeconds} seconds`)
        } catch (error) {
          console.error('Error updating final time log:', error)
        }
      }
    }
    
    // 停止時の状態を更新
    set({
      isRunning: false,
      isPaused: false,
      currentTaskId: null,
      stopwatchInterval: null,
      lastUpdateTime: null,
      stopwatchTime: 0  // リセットする
    })
    
    // データ更新のトリガー
    console.log('Stopwatch stopped, data saved')
  },
  
  resetStopwatch: () => {
    const { stopwatchInterval } = get()
    
    if (stopwatchInterval) {
      clearInterval(stopwatchInterval)
    }
    
    set({
      stopwatchTime: 0,
      isRunning: false,
      isPaused: false,
      currentTaskId: null,
      stopwatchInterval: null,
      lastUpdateTime: null
    })
  },
  
  // Mode actions
  setTimerMode: (mode) => {
    const { stopwatchInterval } = get()
    
    // Stop any running timers when switching modes
    if (stopwatchInterval) {
      clearInterval(stopwatchInterval)
    }
    
    set({
      timerMode: mode,
      isRunning: false,
      isPaused: false,
      currentTaskId: null,
      stopwatchInterval: null,
      lastUpdateTime: null
    })
  },
  
  // Time tracking
  getTodayTotalTime: async () => {
    const { userId } = get()
    if (!userId) return 0
    
    try {
      return await TaskService.getDailyTimeLog(userId, new Date())
    } catch (error) {
      console.error('Error getting today total time:', error)
      return 0
    }
  },
  
  getTaskTotalTime: async (taskId) => {
    const { userId } = get()
    if (!userId) return 0
    
    try {
      return await TaskService.getTaskTimeLog(userId, taskId)
    } catch (error) {
      console.error('Error getting task total time:', error)
      return 0
    }
  },
  
  updateTimerSettings: (settings) => {
    set(settings)
  }
}))