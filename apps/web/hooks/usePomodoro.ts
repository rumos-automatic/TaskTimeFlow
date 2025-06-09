'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types/tasks'
import type { PomodoroSettings } from './usePomodoroSettings'

type TimerMode = 'work' | 'shortBreak' | 'longBreak'

interface PomodoroSession {
  id?: string
  user_id: string
  task_id?: string
  session_type: TimerMode
  planned_duration: number // minutes
  actual_duration: number // minutes
  completed: boolean
  started_at: string
  completed_at?: string
  interruptions: number
  notes?: string
}

interface UsePomodoroProps {
  task?: Task
  settings: PomodoroSettings
  onSessionComplete?: (sessionData: PomodoroSession) => void
}

export function usePomodoro({ task, settings, onSessionComplete }: UsePomodoroProps) {
  const queryClient = useQueryClient()
  
  // Timer state
  const [currentMode, setCurrentMode] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60) // seconds
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [interruptions, setInterruptions] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const initialTimeRef = useRef(settings.workDuration * 60)

  // Calculate progress percentage
  const progress = ((initialTimeRef.current - timeLeft) / initialTimeRef.current) * 100

  // Calculate total sessions for the day
  const totalSessions = settings.sessionsUntilLongBreak

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: Omit<PomodoroSession, 'id' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .insert({
          ...sessionData,
          user_id: user.id
        })
        .select()
        .single()

      if (error) throw error
      return data
    }
  })

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PomodoroSession> }) => {
      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] })
    }
  })

  // Start timer
  const start = useCallback(async () => {
    if (isPaused) {
      // Resume existing session
      setIsRunning(true)
      setIsPaused(false)
      if (currentSessionId) {
        setInterruptions(prev => prev + 1)
      }
    } else {
      // Start new session
      const sessionData = {
        task_id: task?.id,
        session_type: currentMode,
        planned_duration: Math.ceil(timeLeft / 60),
        actual_duration: 0,
        completed: false,
        started_at: new Date().toISOString(),
        interruptions: 0
      }

      try {
        const session = await createSessionMutation.mutateAsync(sessionData)
        setCurrentSessionId(session.id)
        setStartTime(new Date())
        setIsRunning(true)
        setInterruptions(0)
      } catch (error) {
        console.error('Failed to create session:', error)
      }
    }
  }, [isPaused, currentMode, timeLeft, task, currentSessionId, createSessionMutation])

  // Pause timer
  const pause = useCallback(() => {
    setIsRunning(false)
    setIsPaused(true)
  }, [])

  // Stop timer
  const stop = useCallback(async () => {
    setIsRunning(false)
    setIsPaused(false)
    
    if (currentSessionId && startTime) {
      const actualDuration = Math.ceil((Date.now() - startTime.getTime()) / 60000)
      
      await updateSessionMutation.mutateAsync({
        id: currentSessionId,
        updates: {
          actual_duration: actualDuration,
          completed: false,
          completed_at: new Date().toISOString(),
          interruptions
        }
      })
    }
    
    setCurrentSessionId(null)
    setStartTime(null)
    reset()
  }, [currentSessionId, startTime, interruptions, updateSessionMutation])

  // Reset timer
  const reset = useCallback(() => {
    const duration = currentMode === 'work' ? settings.workDuration :
                     currentMode === 'shortBreak' ? settings.shortBreakDuration :
                     settings.longBreakDuration
    
    setTimeLeft(duration * 60)
    initialTimeRef.current = duration * 60
    setIsRunning(false)
    setIsPaused(false)
  }, [currentMode, settings])

  // Skip to next session
  const skip = useCallback(async () => {
    if (currentSessionId && startTime) {
      const actualDuration = Math.ceil((Date.now() - startTime.getTime()) / 60000)
      
      await updateSessionMutation.mutateAsync({
        id: currentSessionId,
        updates: {
          actual_duration: actualDuration,
          completed: false,
          completed_at: new Date().toISOString(),
          interruptions
        }
      })
    }

    // Move to next mode
    if (currentMode === 'work') {
      const newSessionCount = sessionCount + 1
      setSessionCount(newSessionCount)
      
      if (newSessionCount % settings.sessionsUntilLongBreak === 0) {
        setCurrentMode('longBreak')
        setTimeLeft(settings.longBreakDuration * 60)
        initialTimeRef.current = settings.longBreakDuration * 60
      } else {
        setCurrentMode('shortBreak')
        setTimeLeft(settings.shortBreakDuration * 60)
        initialTimeRef.current = settings.shortBreakDuration * 60
      }
    } else {
      setCurrentMode('work')
      setTimeLeft(settings.workDuration * 60)
      initialTimeRef.current = settings.workDuration * 60
    }

    setIsRunning(false)
    setIsPaused(false)
    setCurrentSessionId(null)
    setStartTime(null)
  }, [currentMode, sessionCount, settings, currentSessionId, startTime, interruptions, updateSessionMutation])

  // Timer tick
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft])

  // Handle session completion
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false)
      
      const completeSession = async () => {
        if (currentSessionId && startTime) {
          const actualDuration = Math.ceil((Date.now() - startTime.getTime()) / 60000)
          
          const completedSession = await updateSessionMutation.mutateAsync({
            id: currentSessionId,
            updates: {
              actual_duration: actualDuration,
              completed: true,
              completed_at: new Date().toISOString(),
              interruptions
            }
          })

          if (onSessionComplete) {
            onSessionComplete(completedSession)
          }
        }

        // Auto-advance to next session
        if (currentMode === 'work') {
          const newSessionCount = sessionCount + 1
          setSessionCount(newSessionCount)
          
          if (newSessionCount % settings.sessionsUntilLongBreak === 0) {
            setCurrentMode('longBreak')
            setTimeLeft(settings.longBreakDuration * 60)
            initialTimeRef.current = settings.longBreakDuration * 60
          } else {
            setCurrentMode('shortBreak')
            setTimeLeft(settings.shortBreakDuration * 60)
            initialTimeRef.current = settings.shortBreakDuration * 60
          }

          if (settings.autoStartBreaks) {
            setTimeout(() => start(), 2000) // Auto-start after 2 seconds
          }
        } else {
          setCurrentMode('work')
          setTimeLeft(settings.workDuration * 60)
          initialTimeRef.current = settings.workDuration * 60

          if (settings.autoStartPomodoros) {
            setTimeout(() => start(), 2000) // Auto-start after 2 seconds
          }
        }

        setCurrentSessionId(null)
        setStartTime(null)
      }

      completeSession()
    }
  }, [timeLeft, isRunning, currentMode, sessionCount, settings, currentSessionId, startTime, interruptions, onSessionComplete, updateSessionMutation, start])

  // Update time when settings change
  useEffect(() => {
    if (!isRunning && !isPaused) {
      reset()
    }
  }, [settings, reset, isRunning, isPaused])

  return {
    currentMode,
    timeLeft,
    isRunning,
    isPaused,
    sessionCount,
    totalSessions,
    progress: Math.max(0, Math.min(100, progress)),
    start,
    pause,
    stop,
    reset,
    skip
  }
}


// Hook for Pomodoro session history
export function usePomodoroHistory(limit = 50) {
  return useQuery({
    queryKey: ['pomodoro-sessions', limit],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .select('*, tasks(title)')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    }
  })
}