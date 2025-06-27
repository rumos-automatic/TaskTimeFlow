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
          isBreak: true // Set break mode
        })
        
        // Show notification if enabled
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
        
        // Show notification if enabled
        if (notificationEnabled && typeof window !== 'undefined' && 'Notification' in window) {
          new Notification('休憩終了！', {
            body: customNotificationMessage.breakComplete,
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
        // Basic timer settings
        pomodoroTime: state.pomodoroTime,
        breakTime: state.breakTime,
        longBreakTime: state.longBreakTime,
        longBreakInterval: state.longBreakInterval,
        
        // Notification settings
        soundEnabled: state.soundEnabled,
        notificationEnabled: state.notificationEnabled,
        customNotificationMessage: state.customNotificationMessage,
        
        // Automation settings
        autoStartBreaks: state.autoStartBreaks,
        autoStartPomodoros: state.autoStartPomodoros,
        
        // Display settings
        timerColor: state.timerColor,
        displayMode: state.displayMode,
        
        // Animation settings
        gradientAnimation: state.gradientAnimation,
        waveAnimation: state.waveAnimation,
        colorTransition: state.colorTransition,
        
        // Statistics
        completedPomodoros: state.completedPomodoros
      })
    }
  )
)