'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Play, Pause, SkipForward, Settings, TrendingUp, CheckCircle, Square } from 'lucide-react'
import { useEffect } from 'react'
import { useTimerStore } from '@/lib/store/use-timer-store'
import { useTaskStore } from '@/lib/store/use-task-store'
import { TimerSettings } from './timer-settings'

export function FocusMode() {
  const {
    isRunning,
    isPaused,
    timeRemaining,
    totalTime,
    currentTaskId,
    completedPomodoros,
    timerColor,
    displayMode,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    tick
  } = useTimerStore()

  const { tasks, updateTask, timeSlots } = useTaskStore()

  // Timer effect
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      tick()
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, tick])

  // Helper function to get tasks for current time and next task
  const getTimelineBasedTasks = () => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const today = new Date().toDateString()
    
    // Get today's scheduled slots
    const todaySlots = timeSlots.filter(slot => {
      const slotDate = slot.date instanceof Date ? slot.date : new Date(slot.date)
      return slotDate.toDateString() === today
    })
    
    // Sort slots by start time
    const sortedSlots = todaySlots.sort((a, b) => {
      const [aHour, aMinute] = a.startTime.split(':').map(Number)
      const [bHour, bMinute] = b.startTime.split(':').map(Number)
      return (aHour * 60 + aMinute) - (bHour * 60 + bMinute)
    })
    
    // Find current task (task running right now)
    let currentTask = null
    const currentTime = currentHour * 60 + currentMinute
    
    for (const slot of sortedSlots) {
      const [startHour, startMinute] = slot.startTime.split(':').map(Number)
      const [endHour, endMinute] = slot.endTime.split(':').map(Number)
      
      const startTime = startHour * 60 + startMinute
      const endTime = endHour * 60 + endMinute
      
      if (currentTime >= startTime && currentTime < endTime) {
        const task = tasks.find(t => t.id === slot.taskId)
        if (task && task.status !== 'completed') {
          currentTask = task
          break
        }
      }
    }
    
    // Find next task (next scheduled task after current time)
    let nextTask = null
    for (const slot of sortedSlots) {
      const [startHour, startMinute] = slot.startTime.split(':').map(Number)
      const startTime = startHour * 60 + startMinute
      
      if (startTime > currentTime) {
        const task = tasks.find(t => t.id === slot.taskId)
        if (task && task.status !== 'completed') {
          nextTask = { task, scheduledTime: slot.startTime }
          break
        }
      }
    }
    
    return { currentTask, nextTask }
  }

  // Get current and next tasks from timeline
  const { currentTask: timelineCurrentTask, nextTask: timelineNextTask } = getTimelineBasedTasks()
  
  // Focus view is purely timeline-based - no fallback to timer-based tasks
  const currentTask = timelineCurrentTask
  const nextTask = timelineNextTask?.task || null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0

  // Color mapping for timer display
  const colorClasses = {
    orange: 'text-orange-500',
    blue: 'text-blue-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
    red: 'text-red-500',
    pink: 'text-pink-500'
  }

  const progressColor = colorClasses[timerColor as keyof typeof colorClasses] || 'text-orange-500'

  const handleStartPause = () => {
    if (!isRunning && !isPaused) {
      // Start timer with current task ID if available, otherwise start without task
      startTimer(currentTask?.id)
    } else if (isRunning) {
      // Pause timer
      pauseTimer()
    } else if (isPaused) {
      // Resume timer
      resumeTimer()
    }
  }

  const handleStop = () => {
    stopTimer()
  }

  const handleCompleteTask = () => {
    if (currentTask) {
      updateTask(currentTask.id, { 
        status: 'completed',
        completedAt: new Date()
      })
      stopTimer()
    }
  }

  // Calculate daily statistics
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Pomodoro Timer */}
      <Card className="p-6 text-center bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
        <div className="relative w-32 h-32 mx-auto mb-4">
          {/* Progress Ring */}
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted-foreground/20"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className={`${progressColor} transition-all duration-1000`}
            />
          </svg>
          
          {/* Time Display */}
          <div className="absolute inset-0 flex items-center justify-center">
            {displayMode === 'digital' ? (
              <div className="text-2xl font-mono font-bold text-foreground">
                {formatTime(timeRemaining)}
              </div>
            ) : (
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">
                  {Math.floor(timeRemaining / 60)}
                </div>
                <div className="text-xs text-muted-foreground">
                  分
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex justify-center space-x-2">
          <Button
            variant={isRunning ? "secondary" : "default"}
            size="sm"
            onClick={handleStartPause}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          {(isRunning || isPaused) && (
            <Button variant="outline" size="sm" onClick={handleStop}>
              <Square className="w-4 h-4" />
            </Button>
          )}
          <TimerSettings>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </TimerSettings>
        </div>

        {/* Timer Status */}
        <div className="text-center text-xs text-muted-foreground">
          {isRunning && "タイマー実行中"}
          {isPaused && "一時停止中"}
          {!isRunning && !isPaused && "開始準備完了"}
        </div>
      </Card>

      <Separator />

      {/* Current Task */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">現在のタスク</h3>
          <div className="text-xs text-muted-foreground">
            {timeSlots.length > 0 ? `${timeSlots.length}個のスロット` : 'スロットなし'}
          </div>
        </div>
        {currentTask ? (
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{currentTask.title}</h4>
              <div className="flex items-center space-x-1">
                <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  📅 現在実行中
                </div>
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>予想時間: {currentTask.estimatedTime}分</div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className={`px-1 py-0.5 rounded text-xs ${
                    currentTask.priority === 'high' ? 'bg-red-100 text-red-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    優先度：{currentTask.priority === 'high' ? '高' : '低'}
                  </div>
                  <div className={`px-1 py-0.5 rounded text-xs ${
                    currentTask.urgency === 'high' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    緊急度：{currentTask.urgency === 'high' ? '高' : '低'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4 border-dashed">
            <div className="text-center text-muted-foreground text-sm">
              現在時刻にスケジュールされたタスクがありません
              <div className="text-xs mt-1 opacity-75">
                タイムラインでタスクをスケジュールしてください
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Next Task */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">次のタスク</h3>
          <div className="text-xs text-muted-foreground">
            {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {nextTask ? (
          <Card className="p-4 border-dashed">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{nextTask.title}</h4>
              <div className="flex items-center space-x-1">
                {timelineNextTask && (
                  <div className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    📅 {timelineNextTask.scheduledTime}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>予想時間: {nextTask.estimatedTime}分</div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className={`px-1 py-0.5 rounded text-xs ${
                    nextTask.priority === 'high' ? 'bg-red-100 text-red-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    優先度：{nextTask.priority === 'high' ? '高' : '低'}
                  </div>
                  <div className={`px-1 py-0.5 rounded text-xs ${
                    nextTask.urgency === 'high' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    緊急度：{nextTask.urgency === 'high' ? '高' : '低'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4 border-dashed">
            <div className="text-center text-muted-foreground text-sm">
              スケジュールされた次のタスクがありません
              <div className="text-xs mt-1 opacity-75">
                タイムラインで後の時間にタスクをスケジュールしてください
              </div>
            </div>
          </Card>
        )}
      </div>

      <Separator />

      {/* Daily Statistics */}
      <div className="flex-1 space-y-4">
        <h3 className="text-sm font-medium flex items-center">
          <TrendingUp className="w-4 h-4 mr-2" />
今日の進捗
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
            <div className="text-xs text-muted-foreground">完了</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{inProgressTasks}</div>
            <div className="text-xs text-muted-foreground">進行中</div>
          </Card>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>完了ポモドーロ</span>
            <span>{completedPomodoros}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>今日のタスク数</span>
            <span>{tasks.length}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <Button 
          variant="outline" 
          className="w-full" 
          size="sm"
          onClick={handleCompleteTask}
          disabled={!currentTask}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {currentTask ? "現在のタスクを完了にする" : "完了できるタスクがありません"}
        </Button>
      </div>
    </div>
  )
}