'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Play, Pause, SkipForward, Settings, TrendingUp, CheckCircle, Square } from 'lucide-react'
import { useEffect } from 'react'
import { useTimerStore } from '@/lib/store/use-timer-store'
import { useTaskStore } from '@/lib/store/use-task-store'

export function FocusMode() {
  const {
    isRunning,
    isPaused,
    timeRemaining,
    totalTime,
    currentTaskId,
    completedPomodoros,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    tick
  } = useTimerStore()

  const { tasks, updateTask } = useTaskStore()

  // Timer effect
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      tick()
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, tick])

  // Get current and next tasks
  const currentTask = currentTaskId ? tasks.find(t => t.id === currentTaskId) : null
  const unscheduledTasks = tasks.filter(t => !t.scheduledDate && t.status === 'todo')
  const nextTask = unscheduledTasks.find(t => t.id !== currentTaskId)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0

  const handleStartPause = () => {
    if (!isRunning && !isPaused) {
      // Start new timer
      if (nextTask) {
        startTimer(nextTask.id)
      } else {
        startTimer()
      }
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
              className="text-orange-500 transition-all duration-1000"
            />
          </svg>
          
          {/* Time Display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-2xl font-mono font-bold text-foreground">
              {formatTime(timeRemaining)}
            </div>
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
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
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
        <h3 className="text-sm font-medium">現在のタスク</h3>
        {currentTask ? (
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-sm mb-2">{currentTask.title}</h4>
            <div className="text-xs text-muted-foreground">
              予想時間: {currentTask.estimatedTime}分
            </div>
          </Card>
        ) : (
          <Card className="p-4 border-dashed">
            <div className="text-center text-muted-foreground text-sm">
              タスクが選択されていません
            </div>
          </Card>
        )}
      </div>

      {/* Next Task */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">次のタスク</h3>
        {nextTask ? (
          <Card className="p-4 border-dashed">
            <h4 className="font-medium text-sm mb-2">{nextTask.title}</h4>
            <div className="text-xs text-muted-foreground">
              予想時間: {nextTask.estimatedTime}分
            </div>
          </Card>
        ) : (
          <Card className="p-4 border-dashed">
            <div className="text-center text-muted-foreground text-sm">
              次のタスクがありません
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
          現在のタスクを完了にする
        </Button>
      </div>
    </div>
  )
}