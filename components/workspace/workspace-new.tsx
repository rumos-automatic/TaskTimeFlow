'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { TaskPool } from './task-pool'
import { Timeline } from './timeline'
import { FocusMode } from './focus-mode'
import { useViewState } from '@/lib/hooks/use-view-state'
import { useSwipe } from '@/lib/hooks/use-swipe'
import { useEdgePull } from '@/lib/hooks/use-edge-pull'
import { useTaskStore } from '@/lib/store/use-task-store'
import { Task } from '@/lib/types'
import { 
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter
} from '@dnd-kit/core'
import { 
  ChevronLeft, 
  ChevronRight, 
  ListTodo, 
  Calendar, 
  Target,
  X,
  Clock,
  AlertCircle,
  Circle,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'

export function WorkspaceNew() {
  const { 
    currentView, 
    viewMode, 
    isMobile, 
    setCurrentView, 
    nextView, 
    prevView 
  } = useViewState()

  const { moveTaskToTimeline, tasks, removeTimeSlot, timeSlots } = useTaskStore()
  
  // ドラッグ状態管理
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  // スワイプジェスチャーの設定
  useSwipe({
    onSwipeLeft: nextView,
    onSwipeRight: prevView,
    threshold: 50
  })

  // エッジプル機能（モバイル専用）
  const {
    startDrag: startEdgePull,
    endDrag: endEdgePull,
    isNearLeftEdge,
    isNearRightEdge
  } = useEdgePull({
    onEdgeLeft: () => {
      if (currentView === 'timeline') {
        setCurrentView('tasks')
      } else if (currentView === 'focus') {
        setCurrentView('timeline')
      }
    },
    onEdgeRight: () => {
      if (currentView === 'tasks') {
        setCurrentView('timeline')
      } else if (currentView === 'timeline') {
        setCurrentView('focus')
      }
    },
    enabled: isMobile && !!activeTask,
    edgeThreshold: 40,
    holdDuration: 600
  })

  // ビュー名取得ヘルパー
  const getViewName = (view: string) => {
    switch (view) {
      case 'tasks': return 'タスク'
      case 'timeline': return 'タイムライン'
      case 'focus': return 'フォーカス'
      default: return ''
    }
  }

  const getPrevViewName = () => {
    if (currentView === 'timeline') return getViewName('tasks')
    if (currentView === 'focus') return getViewName('timeline')
    return ''
  }

  const getNextViewName = () => {
    if (currentView === 'tasks') return getViewName('timeline')
    if (currentView === 'timeline') return getViewName('focus')
    return ''
  }

  // ドラッグハンドラー
  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id.toString()
    
    // 通常のタスクの場合
    let task = tasks.find(t => t.id === activeId)
    
    // スケジュール済みタスクの場合 (scheduled-taskId-slotId format)
    if (!task && activeId.startsWith('scheduled-')) {
      const taskId = activeId.split('-')[1]
      task = tasks.find(t => t.id === taskId)
    }
    
    setActiveTask(task || null)
    
    // エッジプル検出を開始（モバイルのみ）
    if (isMobile) {
      startEdgePull()
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    
    // エッジプル検出を停止（モバイルのみ）
    if (isMobile) {
      endEdgePull()
    }

    const activeId = active.id.toString()
    const overId = over?.id.toString()

    // クロススクリーンドロップ処理（モバイル）
    // タスクプールからタイムラインビューへのドロップ（over がない場合）
    if (isMobile && !over && activeTask && currentView === 'timeline' && !activeId.startsWith('scheduled-')) {
      // 現在時刻をデフォルトスロットとして使用
      const currentHour = new Date().getHours()
      const timeString = `${currentHour.toString().padStart(2, '0')}:00`
      const today = new Date()
      
      moveTaskToTimeline(activeId, today, timeString)
      return
    }

    if (!over) return

    // 1. タスクプール → タイムライン (既存タスクの新規スケジュール)
    if (overId && overId.startsWith('timeline-slot-') && !activeId.startsWith('scheduled-')) {
      const timeString = overId.replace('timeline-slot-', '')
      const today = new Date()
      
      moveTaskToTimeline(activeId, today, timeString)
    }
    
    // 2. タイムライン → 別のタイムスロット (スケジュール済みタスクの移動)
    else if (overId && overId.startsWith('timeline-slot-') && activeId.startsWith('scheduled-')) {
      const taskId = activeId.split('-')[1]
      
      // 新しい時間にスケジュール（moveTaskToTimelineが既存スロットを自動削除）
      const timeString = overId.replace('timeline-slot-', '')
      const today = new Date()
      moveTaskToTimeline(taskId, today, timeString)
    }
    
    // 3. タイムライン → タスクプール (スケジュール削除)
    else if (overId === 'task-pool' && activeId.startsWith('scheduled-')) {
      const slotId = activeId.split('-')[2]
      removeTimeSlot(slotId)
    }
  }

  // ドラッグオーバーレイ用のタスクカード
  const DragOverlayCard = ({ task }: { task: Task }) => {
    const priorityColors = {
      high: 'border-red-500 bg-red-50 dark:bg-red-950/20',
      medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
      low: 'border-green-500 bg-green-50 dark:bg-green-950/20'
    }

    const formatTime = (minutes: number) => {
      if (minutes < 60) return `${minutes}分`
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`
    }

    return (
      <div className={`p-4 rounded-lg border-2 shadow-lg ${priorityColors[task.priority]}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-2">{task.title}</h4>
            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(task.estimatedTime)}</span>
              </div>
              <div className="flex items-center space-x-1">
                {task.priority === 'high' && <AlertCircle className="w-3 h-3 text-red-500" />}
                {task.priority === 'medium' && <Circle className="w-3 h-3 text-yellow-500" />}
                {task.priority === 'low' && <Circle className="w-3 h-3 text-green-500" />}
                <span className="capitalize">
                  {task.priority === 'high' && '高'}
                  {task.priority === 'medium' && '中'}
                  {task.priority === 'low' && '低'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // モバイル版：1画面ずつ表示
  if (isMobile) {
    return (
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          {/* シンプルヘッダー */}
          <div className="flex items-center justify-center p-4 border-b border-border/40 bg-card/50 backdrop-blur-sm">
            <h1 className="text-lg font-semibold text-foreground">TaskTimeFlow</h1>
          </div>

          {/* スライドビュー */}
          <div className="flex-1 relative overflow-hidden">
            {/* エッジプルインジケーター */}
            {activeTask && isNearLeftEdge && getPrevViewName() && (
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-50 bg-primary/90 text-primary-foreground px-3 py-2 rounded-r-lg shadow-lg animate-pulse">
                <div className="flex items-center space-x-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">{getPrevViewName()}</span>
                </div>
              </div>
            )}
            
            {activeTask && isNearRightEdge && getNextViewName() && (
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 z-50 bg-primary/90 text-primary-foreground px-3 py-2 rounded-l-lg shadow-lg animate-pulse">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{getNextViewName()}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            )}

            <div className="absolute inset-0 p-4 pb-24 overflow-y-auto">
              {currentView === 'tasks' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-foreground">タスクプール</h2>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs text-muted-foreground">同期済み</span>
                    </div>
                  </div>
                  <TaskPool />
                </div>
              )}
              
              {currentView === 'timeline' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-foreground">タイムライン</h2>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-sm" />
                        <span className="text-sm text-muted-foreground">イベント</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                        <span className="text-sm text-muted-foreground">タスク</span>
                      </div>
                    </div>
                  </div>
                  <Timeline />
                </div>
              )}

              {currentView === 'focus' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-foreground">フォーカス</h2>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span className="text-xs text-muted-foreground">準備完了</span>
                    </div>
                  </div>
                  <FocusMode />
                </div>
              )}
            </div>
          </div>

        {/* 固定フッターナビゲーション */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/40 px-4 py-2 pb-4">
          <div className="flex items-center justify-around max-w-sm mx-auto">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentView('tasks')
              }}
              className={`flex flex-col items-center space-y-1 p-3 rounded-lg transition-all duration-200 min-w-[60px] min-h-[60px] ${
                currentView === 'tasks'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground active:bg-muted/50'
              }`}
            >
              <ListTodo className={`w-5 h-5 ${currentView === 'tasks' ? 'scale-110' : ''} transition-transform`} />
              <span className="text-xs font-medium">タスク</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentView('timeline')
              }}
              className={`flex flex-col items-center space-y-1 p-3 rounded-lg transition-all duration-200 min-w-[60px] min-h-[60px] ${
                currentView === 'timeline'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground active:bg-muted/50'
              }`}
            >
              <Calendar className={`w-5 h-5 ${currentView === 'timeline' ? 'scale-110' : ''} transition-transform`} />
              <span className="text-xs font-medium">時間</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentView('focus')
              }}
              className={`flex flex-col items-center space-y-1 p-3 rounded-lg transition-all duration-200 min-w-[60px] min-h-[60px] ${
                currentView === 'focus'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground active:bg-muted/50'
              }`}
            >
              <Target className={`w-5 h-5 ${currentView === 'focus' ? 'scale-110' : ''} transition-transform`} />
              <span className="text-xs font-medium">集中</span>
            </button>
          </div>

          {/* スワイプインジケーター */}
          <div className="flex justify-center pt-2 space-x-2">
            {(['tasks', 'timeline', 'focus'] as const).map((view) => (
              <div
                key={view}
                className={`h-1 rounded-full transition-all duration-300 ${
                  currentView === view 
                    ? 'bg-primary w-8' 
                    : 'bg-muted-foreground/30 w-2'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* ドラッグオーバーレイ */}
        <DragOverlay>
          {activeTask && <DragOverlayCard task={activeTask} />}
        </DragOverlay>
      </div>
      </DndContext>
    )
  }

  // デスクトップ版：フォーカスモード
  if (viewMode === 'desktop-focus') {
    return (
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex-1 p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-foreground">フォーカスモード</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('timeline')}
                className="p-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <FocusMode />
          </motion.div>
        </div>
        
        {/* ドラッグオーバーレイ */}
        <DragOverlay>
          {activeTask && <DragOverlayCard task={activeTask} />}
        </DragOverlay>
      </DndContext>
    )
  }

  // デスクトップ版：デュアルビュー（タスク + タイムライン）
  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* タスクプール */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-1/3 min-w-[320px] border-r border-border/40 bg-card/50 backdrop-blur-sm"
        >
          <div className="p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">タスクプール</h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-muted-foreground">同期済み</span>
              </div>
            </div>
            <TaskPool />
          </div>
        </motion.div>

        <Separator orientation="vertical" className="w-px" />

        {/* タイムライン */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex-1 bg-background/50 backdrop-blur-sm"
        >
          <div className="p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">タイムライン</h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-sm" />
                  <span className="text-sm text-muted-foreground">イベント</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                  <span className="text-sm text-muted-foreground">タスク</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentView('focus')}
                  className="ml-4"
                >
                  <Target className="w-4 h-4 mr-2" />
                  フォーカスモード
                </Button>
              </div>
            </div>
            <Timeline />
          </div>
        </motion.div>
      </div>
      
      {/* ドラッグオーバーレイ */}
      <DragOverlay>
        {activeTask && <DragOverlayCard task={activeTask} />}
      </DragOverlay>
    </DndContext>
  )
}