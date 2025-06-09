'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Play,
  Pause,
  Square,
  RotateCcw,
  Settings,
  Coffee,
  Target,
  Volume2,
  VolumeX,
  Timer
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePomodoro } from '@/hooks/usePomodoro'
import { usePomodoroSettings } from '@/hooks/usePomodoroSettings'
import { formatTime } from '@/lib/utils'
import type { Task } from '@/types/tasks'

interface PomodoroTimerProps {
  task?: Task
  onSessionComplete?: (sessionData: any) => void
  className?: string
}

type TimerMode = 'work' | 'shortBreak' | 'longBreak'

const TIMER_MODES = {
  work: {
    name: '作業時間',
    icon: Target,
    color: 'text-red-500',
    bgColor: 'bg-red-50'
  },
  shortBreak: {
    name: '短い休憩',
    icon: Coffee,
    color: 'text-green-500',
    bgColor: 'bg-green-50'
  },
  longBreak: {
    name: '長い休憩',
    icon: Coffee,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50'
  }
}

export function PomodoroTimer({ task, onSessionComplete, className }: PomodoroTimerProps) {
  const { settings, updateSettings } = usePomodoroSettings()
  const {
    currentMode,
    timeLeft,
    isRunning,
    isPaused,
    sessionCount,
    totalSessions,
    progress,
    start,
    pause,
    stop,
    reset,
    skip
  } = usePomodoro({
    task,
    settings,
    onSessionComplete
  })

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
  }

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(console.error)
    }
  }, [soundEnabled])

  // Show browser notification
  const showNotification = useCallback((title: string, body: string) => {
    if (notificationPermission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icons/pomodoro.png',
        tag: 'pomodoro-timer'
      })
    }
  }, [notificationPermission])

  // Handle session completion
  useEffect(() => {
    if (progress === 100 && timeLeft === 0) {
      playNotificationSound()
      
      if (currentMode === 'work') {
        showNotification(
          'ポモドーロセッション完了！',
          `${task?.title || '作業'} セッションが完了しました。お疲れ様です！`
        )
      } else {
        showNotification(
          '休憩時間終了',
          '休憩時間が終了しました。次のセッションを開始しましょう！'
        )
      }
    }
  }, [progress, timeLeft, currentMode, task, playNotificationSound, showNotification])

  const getCurrentModeInfo = () => TIMER_MODES[currentMode]
  const modeInfo = getCurrentModeInfo()

  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getProgressColor = () => {
    switch (currentMode) {
      case 'work': return 'bg-red-500'
      case 'shortBreak': return 'bg-green-500'
      case 'longBreak': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <Card className={cn('w-full max-w-md mx-auto', className)}>
      {/* Hidden audio element for notifications */}
      <audio ref={audioRef} preload="auto">
        <source src="/sounds/notification.mp3" type="audio/mpeg" />
        <source src="/sounds/notification.wav" type="audio/wav" />
      </audio>

      <CardHeader className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <modeInfo.icon className={cn('h-5 w-5', modeInfo.color)} />
          <CardTitle className="text-lg">{modeInfo.name}</CardTitle>
        </div>
        {task && (
          <CardDescription className="text-sm truncate">
            {task.title}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Timer Display */}
        <div className={cn('p-8 rounded-lg text-center', modeInfo.bgColor)}>
          <div className="text-6xl font-mono font-bold text-gray-900 mb-4">
            {formatTimeLeft(timeLeft)}
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className={cn('h-2 rounded-full transition-all duration-1000', getProgressColor())}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Session Counter */}
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <Badge variant="outline">
              セッション {sessionCount}/{totalSessions}
            </Badge>
            <Badge variant="outline">
              <Timer className="h-3 w-3 mr-1" />
              {currentMode === 'work' ? settings.workDuration : 
               currentMode === 'shortBreak' ? settings.shortBreakDuration : 
               settings.longBreakDuration}分
            </Badge>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-3">
          {!isRunning && !isPaused ? (
            <Button size="lg" onClick={start} className="px-8">
              <Play className="h-5 w-5 mr-2" />
              開始
            </Button>
          ) : isPaused ? (
            <>
              <Button size="lg" onClick={start} className="px-6">
                <Play className="h-5 w-5 mr-2" />
                再開
              </Button>
              <Button size="lg" variant="outline" onClick={stop}>
                <Square className="h-5 w-5 mr-2" />
                停止
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" variant="outline" onClick={pause}>
                <Pause className="h-5 w-5 mr-2" />
                一時停止
              </Button>
              <Button size="lg" variant="outline" onClick={stop}>
                <Square className="h-5 w-5 mr-2" />
                停止
              </Button>
            </>
          )}

          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={skip}
            disabled={!isRunning && !isPaused}
          >
            スキップ
          </Button>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm">タイマー設定</h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-600">作業時間</label>
                <Select
                  value={settings.workDuration.toString()}
                  onValueChange={(value) => updateSettings({ workDuration: parseInt(value) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 25, 30, 45, 60].map(duration => (
                      <SelectItem key={duration} value={duration.toString()}>
                        {duration}分
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-600">短い休憩</label>
                <Select
                  value={settings.shortBreakDuration.toString()}
                  onValueChange={(value) => updateSettings({ shortBreakDuration: parseInt(value) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20].map(duration => (
                      <SelectItem key={duration} value={duration.toString()}>
                        {duration}分
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-600">長い休憩</label>
                <Select
                  value={settings.longBreakDuration.toString()}
                  onValueChange={(value) => updateSettings({ longBreakDuration: parseInt(value) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 20, 30, 45].map(duration => (
                      <SelectItem key={duration} value={duration.toString()}>
                        {duration}分
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600">長い休憩までのセッション数</label>
              <Select
                value={settings.sessionsUntilLongBreak.toString()}
                onValueChange={(value) => updateSettings({ sessionsUntilLongBreak: parseInt(value) })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6].map(sessions => (
                    <SelectItem key={sessions} value={sessions.toString()}>
                      {sessions}セッション
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Notification Alert */}
        {notificationPermission === 'default' && (
          <Alert>
            <AlertDescription className="text-xs">
              デスクトップ通知を有効にすると、セッション完了時にお知らせします。
              <Button 
                variant="link" 
                className="p-0 h-auto text-xs ml-1"
                onClick={requestNotificationPermission}
              >
                有効にする
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default PomodoroTimer