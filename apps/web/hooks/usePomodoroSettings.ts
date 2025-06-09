'use client'

import { useState, useEffect, useCallback } from 'react'

export interface PomodoroSettings {
  workDuration: number // minutes
  shortBreakDuration: number // minutes
  longBreakDuration: number // minutes
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
}

export function usePomodoroSettings() {
  const [settings, setSettings] = useState<PomodoroSettings>({
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false
  })

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('pomodoro-settings')
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (error) {
        console.error('Failed to parse pomodoro settings:', error)
      }
    }
  }, [])

  // Save settings to localStorage when changed
  const updateSettings = useCallback((updates: Partial<PomodoroSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates }
      localStorage.setItem('pomodoro-settings', JSON.stringify(newSettings))
      return newSettings
    })
  }, [])

  return {
    settings,
    updateSettings
  }
}