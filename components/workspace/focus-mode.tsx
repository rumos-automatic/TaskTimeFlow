'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Play, Pause, SkipForward, Settings, TrendingUp, CheckCircle, Square } from 'lucide-react'
import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useTimerStore } from '@/lib/store/use-timer-store'
import { useTaskStore } from '@/lib/store/use-task-store'
import { TimerSettings } from './timer-settings'
import './fluid-animations.css'

export function FocusMode() {
  const { theme } = useTheme()
  const {
    isRunning,
    isPaused,
    timeRemaining,
    totalTime,
    currentTaskId,
    completedPomodoros,
    timerColor,
    displayMode,
    gradientAnimation,
    waveAnimation,
    colorTransition,
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

  // 🎨 Dynamic color calculation based on time remaining
  const getTimerColor = () => {
    if (!colorTransition) {
      // Use static color
      const colorClasses = {
        orange: 'text-orange-500',
        blue: 'text-blue-500',
        green: 'text-green-500',
        purple: 'text-purple-500',
        red: 'text-red-500',
        pink: 'text-pink-500'
      }
      return colorClasses[timerColor as keyof typeof colorClasses] || 'text-orange-500'
    }

    // Dynamic color transition based on progress
    const progressPercent = progress
    if (progressPercent < 30) {
      return 'text-green-500' // 開始時は緑
    } else if (progressPercent < 60) {
      return 'text-yellow-500' // 中間は黄色
    } else if (progressPercent < 85) {
      return 'text-orange-500' // 後半はオレンジ
    } else {
      return 'text-red-500' // 終盤は赤
    }
  }

  // 🌊 Wave animation CSS
  const waveAnimationClass = waveAnimation ? 'animate-pulse' : ''
  
  // ✨ Gradient animation styles
  const gradientId = 'timer-gradient'
  const progressColor = getTimerColor()

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
      <Card className={`p-6 text-center transition-all duration-1000 h-auto min-h-fit ${
        gradientAnimation
          ? 'shadow-lg' 
          : 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20'
      } ${waveAnimation ? 'animate-pulse' : ''}`}
      style={gradientAnimation ? {
        background: `
          linear-gradient(135deg, 
            hsl(${(progress * 3.6) % 360}, 70%, ${theme === 'dark' ? '15%' : '95%'}) 0%,
            hsl(${((progress * 3.6) + 60) % 360}, 60%, ${theme === 'dark' ? '12%' : '92%'}) 25%,
            hsl(${((progress * 3.6) + 120) % 360}, 65%, ${theme === 'dark' ? '18%' : '94%'}) 50%,
            hsl(${((progress * 3.6) + 180) % 360}, 55%, ${theme === 'dark' ? '20%' : '96%'}) 75%,
            hsl(${((progress * 3.6) + 240) % 360}, 75%, ${theme === 'dark' ? '16%' : '93%'}) 100%
          )
        `,
        backgroundSize: '200% 200%',
        animation: waveAnimation ? 'gradient-shift 8s ease infinite, pulse 2s ease-in-out infinite alternate' : 'gradient-shift 8s ease infinite'
      } : {}}>
        <div className="relative w-32 h-32 mx-auto mb-4 overflow-visible">
          {/* Progress Ring with Magic Effects */}
          <svg className={`w-32 h-32 transform -rotate-90 ${waveAnimationClass}`} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
            {/* 🌊 Dynamic Fluid Gradient Definitions */}
            <defs>
              {gradientAnimation && (
                <>
                  {/* 流体グラデーション1: 煙のような動き */}
                  <linearGradient id={`${gradientId}-fluid1`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopOpacity="1">
                      <animate attributeName="stop-color" 
                        values="rgb(59, 130, 246);rgb(147, 51, 234);rgb(239, 68, 68);rgb(34, 197, 94);rgb(236, 72, 153);rgb(59, 130, 246)" 
                        dur="4s" 
                        repeatCount="indefinite" />
                    </stop>
                    <stop offset="30%" stopOpacity="0.9">
                      <animate attributeName="stop-color" 
                        values="rgb(147, 51, 234);rgb(239, 68, 68);rgb(34, 197, 94);rgb(236, 72, 153);rgb(59, 130, 246);rgb(147, 51, 234)" 
                        dur="4s" 
                        repeatCount="indefinite" />
                    </stop>
                    <stop offset="70%" stopOpacity="0.8">
                      <animate attributeName="stop-color" 
                        values="rgb(239, 68, 68);rgb(34, 197, 94);rgb(236, 72, 153);rgb(59, 130, 246);rgb(147, 51, 234);rgb(239, 68, 68)" 
                        dur="4s" 
                        repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopOpacity="1">
                      <animate attributeName="stop-color" 
                        values="rgb(34, 197, 94);rgb(236, 72, 153);rgb(59, 130, 246);rgb(147, 51, 234);rgb(239, 68, 68);rgb(34, 197, 94)" 
                        dur="4s" 
                        repeatCount="indefinite" />
                    </stop>
                    
                    {/* グラデーション位置のアニメーション */}
                    <animateTransform 
                      attributeName="gradientTransform" 
                      type="rotate" 
                      values="0 50 50;360 50 50" 
                      dur="8s" 
                      repeatCount="indefinite" />
                  </linearGradient>

                  {/* 流体グラデーション2: 波のような逆回転 */}
                  <linearGradient id={`${gradientId}-fluid2`} x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopOpacity="0.7">
                      <animate attributeName="stop-color" 
                        values="rgb(236, 72, 153);rgb(59, 130, 246);rgb(147, 51, 234);rgb(239, 68, 68);rgb(34, 197, 94);rgb(236, 72, 153)" 
                        dur="6s" 
                        repeatCount="indefinite" />
                    </stop>
                    <stop offset="50%" stopOpacity="1">
                      <animate attributeName="stop-color" 
                        values="rgb(59, 130, 246);rgb(147, 51, 234);rgb(239, 68, 68);rgb(34, 197, 94);rgb(236, 72, 153);rgb(59, 130, 246)" 
                        dur="6s" 
                        repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopOpacity="0.8">
                      <animate attributeName="stop-color" 
                        values="rgb(147, 51, 234);rgb(239, 68, 68);rgb(34, 197, 94);rgb(236, 72, 153);rgb(59, 130, 246);rgb(147, 51, 234)" 
                        dur="6s" 
                        repeatCount="indefinite" />
                    </stop>
                    
                    {/* 逆回転 */}
                    <animateTransform 
                      attributeName="gradientTransform" 
                      type="rotate" 
                      values="360 50 50;0 50 50" 
                      dur="12s" 
                      repeatCount="indefinite" />
                  </linearGradient>

                  {/* 煙効果用ラジアルグラデーション */}
                  <radialGradient id={`${gradientId}-smoke`} cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopOpacity="0">
                      <animate attributeName="stop-color" 
                        values="rgb(255, 255, 255);rgb(59, 130, 246);rgb(147, 51, 234);rgb(239, 68, 68);rgb(255, 255, 255)" 
                        dur="5s" 
                        repeatCount="indefinite" />
                    </stop>
                    <stop offset="40%" stopOpacity="0.3">
                      <animate attributeName="stop-color" 
                        values="rgb(59, 130, 246);rgb(147, 51, 234);rgb(239, 68, 68);rgb(34, 197, 94);rgb(59, 130, 246)" 
                        dur="5s" 
                        repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopOpacity="0.8">
                      <animate attributeName="stop-color" 
                        values="rgb(147, 51, 234);rgb(239, 68, 68);rgb(34, 197, 94);rgb(236, 72, 153);rgb(147, 51, 234)" 
                        dur="5s" 
                        repeatCount="indefinite" />
                    </stop>
                    
                    {/* 煙の拡散アニメーション */}
                    <animateTransform 
                      attributeName="gradientTransform" 
                      type="scale" 
                      values="0.8 0.8;1.2 1.2;0.8 0.8" 
                      dur="6s" 
                      repeatCount="indefinite" />
                  </radialGradient>

                  {/* Simplified glow effect */}
                  <filter id="fluid-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge> 
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </>
              )}
            </defs>

            {/* Background Circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted-foreground/20"
            />
            
            {gradientAnimation ? (
              /* 🌊 Multi-Layer Fluid Animation */
              <g>
                {/* Layer 1: メインの流体グラデーション */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={`url(#${gradientId}-fluid1)`}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                  filter="url(#fluid-glow)"
                  style={{
                    transform: waveAnimation ? 'scale(1.03)' : 'scale(1)',
                    transformOrigin: 'center',
                    transition: 'transform 3s ease-in-out infinite alternate'
                  }}
                />
                
                {/* Layer 2: 逆回転する波の層 */}
                <circle
                  cx="50"
                  cy="50"
                  r="43"
                  fill="none"
                  stroke={`url(#${gradientId}-fluid2)`}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 43}`}
                  strokeDashoffset={`${2 * Math.PI * 43 * (1 - progress / 100)}`}
                  opacity="0.8"
                  style={{
                    transform: waveAnimation ? 'scale(0.98)' : 'scale(1)',
                    transformOrigin: 'center',
                    transition: 'transform 2s ease-in-out infinite alternate-reverse'
                  }}
                />
                
                {/* Layer 3: 煙のような内側の効果 */}
                <circle
                  cx="50"
                  cy="50"
                  r="47"
                  fill="none"
                  stroke={`url(#${gradientId}-smoke)`}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 47}`}
                  strokeDashoffset={`${2 * Math.PI * 47 * (1 - progress / 100)}`}
                  opacity="0.6"
                  style={{
                    transform: waveAnimation ? 'scale(1.05) rotate(2deg)' : 'scale(1)',
                    transformOrigin: 'center',
                    transition: 'transform 4s ease-in-out infinite alternate'
                  }}
                />
                
                {/* Layer 4: 微細な動きの追加レイヤー */}
                <circle
                  cx="50"
                  cy="50"
                  r="41"
                  fill="none"
                  stroke={`url(#${gradientId}-fluid1)`}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 41}`}
                  strokeDashoffset={`${2 * Math.PI * 41 * (1 - progress / 100)}`}
                  opacity="0.5"
                  style={{
                    transform: waveAnimation ? 'scale(0.95) rotate(-1deg)' : 'scale(1)',
                    transformOrigin: 'center',
                    transition: 'transform 1.5s ease-in-out infinite alternate'
                  }}
                />
              </g>
            ) : (
              /* Static Progress Circle */
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
                style={{
                  transform: waveAnimation ? 'scale(1.02)' : 'scale(1)',
                  transformOrigin: 'center',
                  transition: 'transform 2s ease-in-out infinite alternate'
                }}
              />
            )}

            {/* ✨ Enhanced Dynamic Sparkle Effects */}
            {gradientAnimation && (
              <g opacity={progress > 85 || progress < 15 ? "1" : "0.6"}>
                {/* 動的なスパークル群 1 */}
                <g>
                  <circle r="2" fill="rgb(236, 72, 153)">
                    <animateMotion dur="6s" repeatCount="indefinite" 
                      path="M 15,25 Q 50,15 85,35 Q 50,85 15,25" />
                    <animate attributeName="opacity" values="0;1;0.5;1;0" dur="6s" repeatCount="indefinite" />
                    <animate attributeName="r" values="1;3;1;2;1" dur="6s" repeatCount="indefinite" />
                  </circle>
                </g>
                
                {/* 動的なスパークル群 2 */}
                <g>
                  <circle r="1.5" fill="rgb(59, 130, 246)">
                    <animateMotion dur="8s" repeatCount="indefinite" 
                      path="M 85,20 Q 30,40 25,80 Q 70,40 85,20" />
                    <animate attributeName="opacity" values="1;0;1;0.3;1" dur="8s" repeatCount="indefinite" />
                    <animate attributeName="r" values="0.5;2;1;2.5;0.5" dur="8s" repeatCount="indefinite" />
                  </circle>
                </g>
                
                {/* 動的なスパークル群 3 */}
                <g>
                  <circle r="1" fill="rgb(34, 197, 94)">
                    <animateMotion dur="5s" repeatCount="indefinite" 
                      path="M 50,15 Q 80,50 50,85 Q 20,50 50,15" />
                    <animate attributeName="opacity" values="0.3;1;0;1;0.3" dur="5s" repeatCount="indefinite" />
                    <animate attributeName="r" values="1;1.5;2;1;1" dur="5s" repeatCount="indefinite" />
                  </circle>
                </g>
                
                {/* 追加の煙のようなパーティクル - simplified */}
                <g opacity="0.3">
                  {Array.from({length: 4}).map((_, i) => {
                    const angle = (i * 90) + (progress * 1.8) // progressに基づいて動的に配置
                    const x = 50 + 30 * Math.cos(angle * Math.PI / 180)
                    const y = 50 + 30 * Math.sin(angle * Math.PI / 180)
                    return (
                      <circle key={i} cx={x} cy={y} r="0.8" fill={`hsl(${200 + i * 40}, 60%, 70%)`}>
                        <animate attributeName="opacity" 
                          values="0.1;0.6;0.1" 
                          dur={`${3 + i}s`} 
                          repeatCount="indefinite" />
                      </circle>
                    )
                  })}
                </g>
              </g>
            )}
          </svg>
          
          {/* Time Display */}
          <div className="absolute inset-0 flex items-center justify-center">
            {displayMode === 'digital' ? (
              <div className={`text-2xl font-mono font-bold ${
                gradientAnimation && theme === 'dark' 
                  ? 'text-white drop-shadow-md' 
                  : gradientAnimation 
                    ? 'text-slate-700 drop-shadow-sm'
                    : 'text-foreground'
              }`}>
                {formatTime(timeRemaining)}
              </div>
            ) : (
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  gradientAnimation && theme === 'dark' 
                    ? 'text-white drop-shadow-md' 
                    : gradientAnimation 
                      ? 'text-slate-700 drop-shadow-sm'
                      : 'text-foreground'
                }`}>
                  {Math.floor(timeRemaining / 60)}
                </div>
                <div className={`text-xs ${
                  gradientAnimation && theme === 'dark' 
                    ? 'text-white/80 drop-shadow-md' 
                    : gradientAnimation 
                      ? 'text-slate-600 drop-shadow-sm'
                      : 'text-muted-foreground'
                }`}>
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