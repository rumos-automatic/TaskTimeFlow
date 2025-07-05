'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { TaskPool } from './task-pool'
import { Timeline } from './timeline'
import { FocusMode } from './focus-mode'
import { useViewState } from '@/lib/hooks/use-view-state'
import { useSwipe } from '@/lib/hooks/use-swipe'
import { useEdgePull } from '@/lib/hooks/use-edge-pull'
import { useAutoScroll } from '@/lib/hooks/use-auto-scroll'
import { useScrollLock } from '@/lib/hooks/use-scroll-lock'
import { usePullToRefreshBlocker } from '@/lib/hooks/use-pull-to-refresh-blocker'
import { useTaskStoreWithAuth } from '@/lib/hooks/use-task-store-with-auth'
import { useCategoryStoreWithAuth } from '@/lib/hooks/use-category-store-with-auth'
import { useAuth } from '@/lib/auth/auth-context'
import { Task } from '@/lib/types'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/auth/user-menu'
import { AIChatDialog } from '@/components/ai/ai-chat-dialog'
import { 
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors
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
  ArrowRight,
  RotateCcw,
  Bot
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

  const { user } = useAuth()
  const { moveTaskToTimeline, tasks, removeTimeSlot, timeSlots, reorderTasks } = useTaskStoreWithAuth()
  const categoryStore = useCategoryStoreWithAuth()
  
  // ドラッグ状態管理
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartView, setDragStartView] = useState<string | null>(null)
  
  // タイムライン日付管理
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  // AI チャット表示管理
  const [showAIChat, setShowAIChat] = useState(false)

  // リサイザー関連の状態管理
  const [leftPanelWidth, setLeftPanelWidth] = useState(33) // デフォルト33%
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // フッター要素のref
  const footerRef = React.useRef<HTMLDivElement>(null)
  
  // 各ビューのスクロールコンテナのref
  const taskPoolRef = React.useRef<HTMLDivElement>(null)
  const timelineRef = React.useRef<HTMLDivElement>(null)
  const focusRef = React.useRef<HTMLDivElement>(null)
  
  // モバイル用の各ビューのref
  const mobileTaskPoolRef = React.useRef<HTMLDivElement>(null)
  const mobileTimelineRef = React.useRef<HTMLDivElement>(null)
  const mobileFocusRef = React.useRef<HTMLDivElement>(null)
  
  // タイムラインの初回スクロール管理
  const [hasInitialTimelineScroll, setHasInitialTimelineScroll] = React.useState(false)

  // カテゴリストアは useCategoryStoreWithAuth で自動初期化される

  // localStorage から幅設定を読み込み
  React.useEffect(() => {
    const savedWidth = localStorage.getItem('taskTimeFlow-leftPanelWidth')
    if (savedWidth) {
      const width = parseInt(savedWidth)
      if (width >= 25 && width <= 60) { // 25%～60%の範囲で制限
        setLeftPanelWidth(width)
      }
    }
  }, [])

  // 幅変更時にlocalStorageに保存
  React.useEffect(() => {
    localStorage.setItem('taskTimeFlow-leftPanelWidth', leftPanelWidth.toString())
  }, [leftPanelWidth])

  // リサイザーのドラッグ機能
  const handleResizeStart = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    
    // ドラッグ中のカーソルスタイルを設定
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      
      const containerRect = containerRef.current.getBoundingClientRect()
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
      
      // 最小幅25%、最大幅60%で制限
      const minWidth = 25
      const maxWidth = 60
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newLeftWidth))
      
      setLeftPanelWidth(clampedWidth)
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      // カーソルスタイルをリセット
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  
  // ビュー切り替え時のスクロール位置リセット
  const resetScrollOnViewChange = React.useCallback((prevView: string) => {
    // タスクプールビューまたはフォーカスビューの場合は一番上にスクロール
    if (currentView === 'tasks') {
      const taskContainer = isMobile ? mobileTaskPoolRef.current : taskPoolRef.current
      if (taskContainer) {
        taskContainer.scrollTop = 0
      }
    }
    if (currentView === 'focus') {
      const focusContainer = isMobile ? mobileFocusRef.current : focusRef.current
      if (focusContainer) {
        focusContainer.scrollTop = 0
      }
    }
    // タイムラインビューに切り替わった場合、スクロールフラグをリセット
    if (currentView === 'timeline' && prevView !== 'timeline') {
      setHasInitialTimelineScroll(false)
    }
  }, [currentView, isMobile])
  
  // ビューが変更された時にスクロール位置を処理
  const prevViewRef = React.useRef(currentView)
  React.useEffect(() => {
    const prevView = prevViewRef.current
    prevViewRef.current = currentView
    
    if (prevView !== currentView) {
      resetScrollOnViewChange(prevView)
    }
  }, [currentView, resetScrollOnViewChange])
  
  
  // スワイプジェスチャーの設定（フッターエリアのみ、ドラッグ中は無効）
  useSwipe({
    onSwipeLeft: nextView,
    onSwipeRight: prevView,
    threshold: 50,
    targetRef: footerRef,
    enabled: isMobile && !isDragging
  })

  // ドラッグセンサーの設定
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10
    }
  })

  const touchSensor = useSensor(TouchSensor, {
    // モバイルでのスムーズなドラッグ
    activationConstraint: {
      delay: 150,
      tolerance: 5,
      distance: 8
    }
  })

  const keyboardSensor = useSensor(KeyboardSensor)

  const sensors = useSensors(
    mouseSensor,
    touchSensor,
    keyboardSensor
  )

  // ハプティックフィードバック
  const triggerHapticFeedback = React.useCallback(() => {
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(10) // 10ms の短い振動
    }
  }, [isMobile])

  // エッジプル機能（モバイル専用：タスクプール ⇄ タイムライン）
  const {
    startDrag: startEdgePull,
    endDrag: endEdgePull,
    isNearLeftEdge,
    isNearRightEdge
  } = useEdgePull({
    onEdgeLeft: () => {
      if (currentView === 'timeline' && isDragging) {
        console.log('Edge pull: timeline -> tasks')
        setCurrentView('tasks')
      }
    },
    onEdgeRight: () => {
      if (currentView === 'tasks' && isDragging) {
        console.log('Edge pull: tasks -> timeline')
        setCurrentView('timeline')
      }
    },
    enabled: isMobile && isDragging && (currentView === 'tasks' || currentView === 'timeline'),
    edgeThreshold: 60,
    holdDuration: 100
  })

  // スクロールロック機能（モバイル専用）
  // タイムラインでのドラッグ中のみ有効
  useScrollLock({
    isLocked: isMobile && isDragging && currentView === 'timeline'
  })

  // プルトゥリフレッシュ防止（ドラッグ中のみ）
  usePullToRefreshBlocker({
    isActive: isMobile && isDragging
  })

  // TouchSensorでiOS風のドラッグアンドドロップを実現
  // 300msの長押しでドラッグ開始、ハプティックフィードバック付き

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
    return ''
  }

  const getNextViewName = () => {
    if (currentView === 'tasks') return getViewName('timeline')
    return ''
  }

  // ドラッグハンドラー
  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag start:', event.active.id)
    const activeId = event.active.id.toString()
    
    // 通常のタスクの場合
    let task = tasks.find(t => t.id === activeId)
    
    // タスクプールのスケジュール済みタスクの場合 (pool-taskId format)
    if (!task && activeId.startsWith('pool-')) {
      const taskId = activeId.substring(5) // 'pool-' を除去
      task = tasks.find(t => t.id === taskId)
      console.log('Extracted task ID from pool:', taskId)
    }
    
    // タイムラインのスケジュール済みタスクの場合 (scheduled-taskId-slotId format)
    else if (!task && activeId.startsWith('scheduled-')) {
      // scheduled-{UUID}-{UUID} の形式からタスクIDを正しく抽出
      // UUIDは36文字固定なので、scheduled- を除いて前から36文字がtaskId
      const withoutPrefix = activeId.substring(10) // 'scheduled-' を除去
      if (withoutPrefix.length >= 73) { // 36(taskId) + 1(-) + 36(slotId) = 73
        const taskId = withoutPrefix.substring(0, 36)
        const slotId = withoutPrefix.substring(37) // 37文字目から最後まで
        task = tasks.find(t => t.id === taskId)
        console.log('Extracted task ID from scheduled:', taskId, 'slot ID:', slotId)
        console.log('Original activeId:', activeId)
      }
    }
    
    console.log('Found task:', task)
    setActiveTask(task || null)
    setIsDragging(true)
    setDragStartView(currentView)
    
    // ハプティックフィードバック
    triggerHapticFeedback()
    
    // エッジプル機能開始（モバイルのみ）
    if (isMobile) {
      startEdgePull()
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    console.log('🔚 Drag end started')
    console.log('🔚 event.active.id:', event.active.id)
    console.log('🔚 event.over?.id:', event.over?.id)
    console.log('🔚 dragStartView:', dragStartView, '-> currentView:', currentView)
    console.log('🔚 user:', user?.id)
    console.log('🔚 activeTask:', activeTask?.title)
    
    const { active, over } = event
    
    let activeId = active.id.toString()
    const overId = over?.id.toString()
    
    // pool- プレフィックスを除去して実際のタスクIDを取得
    let actualTaskId = activeId
    if (activeId.startsWith('pool-')) {
      actualTaskId = activeId.substring(5)
      console.log('🔍 Removed pool prefix:', activeId, '->', actualTaskId)
    }
    
    // 通常のドラッグ&ドロップ処理（overが存在する場合）
    if (over) {
      console.log('✅ Normal drag & drop with over:', overId)
      
      // 1. タスクプール内の並び替え
      if (overId && !overId.startsWith('timeline-slot-') && !overId.startsWith('scheduled-') && 
          overId !== 'task-pool' && !activeId.startsWith('scheduled-')) {
        console.log('🔄 Task pool reorder:', activeId, 'over', overId)
        // reorderTasksは内部でpool-プレフィックスを処理するので、そのまま渡す
        reorderTasks(activeId, overId)
      }
      
      // 2. タスクプール → タイムライン (既存タスクの新規スケジュール)
      else if (overId && overId.startsWith('timeline-slot-') && !activeId.startsWith('scheduled-') && user) {
        const timeString = overId.replace('timeline-slot-', '')
        console.log('📅➡️ Moving task to timeline:', { actualTaskId, timeString, selectedDate: selectedDate.toDateString(), userId: user.id })
        moveTaskToTimeline(actualTaskId, selectedDate, timeString, user.id)
        console.log('✅ Normal: Moved task to timeline slot:', actualTaskId, 'at', timeString, 'on', selectedDate.toDateString())
      }
      
      // 3. タイムライン → 別のタイムスロット (スケジュール済みタスクの移動)
      else if (overId && overId.startsWith('timeline-slot-') && activeId.startsWith('scheduled-') && user) {
        // scheduled-{UUID}-{UUID} の形式からタスクIDとスロットIDを正しく抽出
        const withoutPrefix = activeId.substring(10) // 'scheduled-' を除去
        if (withoutPrefix.length >= 73) { // 36(taskId) + 1(-) + 36(slotId) = 73
          const taskId = withoutPrefix.substring(0, 36)
          const slotId = withoutPrefix.substring(37) // 37文字目から最後まで
          const timeString = overId.replace('timeline-slot-', '')
          
          console.log('📅🔄 Parsing scheduled task ID:', { 
            activeId, 
            withoutPrefix,
            extractedTaskId: taskId, 
            extractedSlotId: slotId 
          })
          
          // 既存のスロットから現在の日付を取得
          const existingSlot = timeSlots.find(slot => slot.id === slotId)
          const moveDate = existingSlot?.date || selectedDate // 既存の日付を保持、なければ選択された日付
          
          console.log('📅🔄 Moving scheduled task to new slot:', { 
            taskId, 
            slotId,
            timeString, 
            moveDate: moveDate.toDateString(), 
            userId: user.id,
            existingSlot: existingSlot ? { id: existingSlot.id, time: existingSlot.startTime } : null
          })
          
          moveTaskToTimeline(taskId, moveDate, timeString, user.id)
          console.log('✅ Normal: Moved scheduled task to new slot:', taskId, 'at', timeString, 'on', moveDate.toDateString())
        } else {
          console.error('❌ Invalid scheduled task ID format:', activeId)
        }
      }
      
      // 4. タイムライン → タスクプール (スケジュール削除)
      else if (overId === 'task-pool' && activeId.startsWith('scheduled-')) {
        // scheduled-{UUID}-{UUID} の形式からスロットIDを正しく抽出
        const withoutPrefix = activeId.substring(10) // 'scheduled-' を除去
        if (withoutPrefix.length >= 73) { // 36(taskId) + 1(-) + 36(slotId) = 73
          const slotId = withoutPrefix.substring(37) // 37文字目から最後まで
          console.log('🗑️ Removing task from timeline:', { slotId, activeId, withoutPrefix })
          removeTimeSlot(slotId)
          console.log('✅ Normal: Removed task from timeline:', slotId)
        } else {
          console.error('❌ Invalid scheduled task ID format for removal:', activeId)
        }
      }
      
      // その他の条件に該当しない場合
      else {
        console.log('❓ Unhandled drag case:', { activeId, overId, user: !!user })
      }
    }
    // クロスビュードラッグ処理（overが存在せず、ビューが変わった場合）
    else if (isMobile && !over && activeTask && dragStartView && dragStartView !== currentView) {
      console.log('📱 Cross-view drag without drop target:', dragStartView, '->', currentView, 'activeId:', activeId)
      
      // タスクプールからタイムラインへのクロスビュードラッグ
      if (dragStartView === 'tasks' && currentView === 'timeline' && !activeId.startsWith('scheduled-') && user) {
        const now = new Date()
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        // 15分単位に丸める
        const roundedMinute = Math.floor(currentMinute / 15) * 15
        const timeString = `${currentHour.toString().padStart(2, '0')}:${roundedMinute.toString().padStart(2, '0')}`
        console.log('📱📅➡️ Cross-view moving task to selected date:', { actualTaskId, timeString, selectedDate: selectedDate.toDateString(), userId: user.id })
        moveTaskToTimeline(actualTaskId, selectedDate, timeString, user.id)
        console.log('✅ Cross-view: Moved task to selected date:', actualTaskId, 'at', timeString, 'on', selectedDate.toDateString())
      }
      
      // タイムラインからタスクプールへのクロスビュードラッグ
      else if (dragStartView === 'timeline' && currentView === 'tasks' && activeId.startsWith('scheduled-')) {
        // scheduled-{UUID}-{UUID} の形式からスロットIDを正しく抽出
        const withoutPrefix = activeId.substring(10) // 'scheduled-' を除去
        if (withoutPrefix.length >= 73) { // 36(taskId) + 1(-) + 36(slotId) = 73
          const slotId = withoutPrefix.substring(37) // 37文字目から最後まで
          console.log('📱🗑️ Cross-view removing task from timeline:', { slotId, activeId, withoutPrefix })
          removeTimeSlot(slotId)
          console.log('✅ Cross-view: Removed task from timeline:', slotId)
        } else {
          console.error('❌ Invalid scheduled task ID format for cross-view removal:', activeId)
        }
      }
      
      // その他のクロスビューケース
      else {
        console.log('❓ Unhandled cross-view drag case:', { 
          dragStartView, 
          currentView, 
          activeId, 
          startsWithScheduled: activeId.startsWith('scheduled-'),
          user: !!user 
        })
      }
    }
    // ドロップターゲットがない場合
    else {
      console.log('❌ No drop target or conditions not met:', {
        isMobile,
        hasOver: !!over,
        hasActiveTask: !!activeTask,
        dragStartView,
        currentView,
        viewChanged: dragStartView !== currentView
      })
    }
    
    // 状態をリセット
    setActiveTask(null)
    setIsDragging(false)
    setDragStartView(null)
    
    // エッジプル機能終了（モバイルのみ）
    if (isMobile) {
      endEdgePull()
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
      <div className={`p-4 rounded-lg border-2 shadow-2xl ${priorityColors[task.priority]} transform scale-110`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-2 text-black dark:text-white">{task.title}</h4>
            <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(task.estimatedTime)}</span>
              </div>
              <div className="flex items-center space-x-1">
                {task.priority === 'high' && <AlertCircle className="w-3 h-3 text-red-500" />}
                {task.priority === 'low' && <Circle className="w-3 h-3 text-green-500" />}
                <span className="capitalize">
                  優先度：{task.priority === 'high' ? '高' : '低'}
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
    // フッターの高さを定義（実際のフッター高さに合わせて最適化）
    const MOBILE_FOOTER_HEIGHT = 100
    
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={`flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 mobile-drag-container ${isMobile && isDragging ? 'dragging' : ''}`}>
          {/* シンプルヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-border/40 bg-card/50 backdrop-blur-sm">
            <ThemeToggle />
            <h1 className="text-lg font-semibold text-foreground">TaskTimeFlow</h1>
            <div className="flex items-center space-x-2">
              {/* AIチャットボタン */}
              <button
                onClick={() => setShowAIChat(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 active:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="AI アシスタント"
              >
                <Bot className="w-4 h-4" />
              </button>
              <UserMenu />
              {/* 再読み込みボタン */}
              <button
                onClick={() => window.location.reload()}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 active:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="ページを再読み込み"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* スライドビュー */}
          <div className="flex-1 relative overflow-hidden">
            {/* エッジプルインジケーター */}
            {isDragging && isNearLeftEdge && getPrevViewName() && (
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-40 bg-primary/90 text-primary-foreground px-3 py-2 rounded-r-lg shadow-lg animate-pulse">
                <div className="flex items-center space-x-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">{getPrevViewName()}</span>
                </div>
              </div>
            )}
            
            {isDragging && isNearRightEdge && getNextViewName() && (
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 z-40 bg-primary/90 text-primary-foreground px-3 py-2 rounded-l-lg shadow-lg animate-pulse">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{getNextViewName()}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            )}

            {currentView === 'tasks' && (
              <div ref={mobileTaskPoolRef} className="absolute top-0 left-0 right-0 p-4 overflow-y-auto" style={{ bottom: `${MOBILE_FOOTER_HEIGHT}px` }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">タスクプール</h2>
                </div>
                <TaskPool />
              </div>
            )}
            
            {currentView === 'timeline' && (
              <div ref={mobileTimelineRef} className="absolute top-0 left-0 right-0 p-4 overflow-y-auto" style={{ bottom: `${MOBILE_FOOTER_HEIGHT}px` }}>
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
                    {isDragging && dragStartView && dragStartView !== currentView && (
                      <div className="text-sm text-primary font-medium animate-pulse bg-primary/10 px-2 py-1 rounded">
                        📍 ドロップで{dragStartView === 'tasks' ? 'タイムラインに' : 'プールに'}配置
                      </div>
                    )}
                  </div>
                </div>
                <Timeline 
                  hasInitialScroll={hasInitialTimelineScroll} 
                  setHasInitialScroll={setHasInitialTimelineScroll}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  mobileContainerRef={mobileTimelineRef}
                />
              </div>
            )}

            {currentView === 'focus' && (
              <div ref={mobileFocusRef} className="absolute top-0 left-0 right-0 p-4 overflow-y-auto" style={{ bottom: `${MOBILE_FOOTER_HEIGHT}px` }}>
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

        {/* 固定フッターナビゲーション */}
        <div 
          ref={footerRef}
          className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/40 px-4 pt-2 pb-3"
        >
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
          <div className="flex justify-center pt-1 space-x-2">
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
        <DragOverlay 
          style={{ zIndex: 10000 }}
          dropAnimation={{
            duration: 300,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)'
          }}
        >
          {activeTask && (
            <div className="pointer-events-none">
              <DragOverlayCard task={activeTask} />
            </div>
          )}
        </DragOverlay>
        
        {/* AI チャットダイアログ */}
        <AIChatDialog open={showAIChat} onOpenChange={setShowAIChat} />
      </div>
      </DndContext>
    )
  }

  // デスクトップ版：フォーカスモード
  if (viewMode === 'desktop-focus') {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex-1 p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-foreground">フォーカスモード</h1>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAIChat(true)}
                  className="p-2"
                  title="AI アシスタント"
                >
                  <Bot className="w-4 h-4" />
                </Button>
                <UserMenu />
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCurrentView('timeline')
                    // フォーカスモードからタイムラインに戻る時は現在時刻スクロール機能を維持
                  }}
                  className="p-2"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <FocusMode />
          </motion.div>
        </div>
        
        {/* ドラッグオーバーレイ */}
        <DragOverlay 
          style={{ zIndex: 10000 }}
          dropAnimation={{
            duration: 300,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)'
          }}
        >
          {activeTask && (
            <div className="pointer-events-none">
              <DragOverlayCard task={activeTask} />
            </div>
          )}
        </DragOverlay>
        
        {/* AI チャットダイアログ */}
        <AIChatDialog open={showAIChat} onOpenChange={setShowAIChat} />
      </DndContext>
    )
  }

  // デスクトップ版：デュアルビュー（タスク + タイムライン）
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div 
        ref={containerRef}
        className={`flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 ${isResizing ? 'select-none' : ''}`}
      >
        {/* タスクプール */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-card/50 backdrop-blur-sm h-full overflow-hidden"
          style={{ width: `${leftPanelWidth}%`, minWidth: '320px' }}
        >
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h2 className="text-xl font-semibold text-foreground">タスクプール</h2>
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAIChat(true)}
                  className="p-2"
                  title="AI アシスタント"
                >
                  <Bot className="w-4 h-4" />
                </Button>
                <UserMenu />
                <ThemeToggle />
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <TaskPool />
            </div>
          </div>
        </motion.div>

        {/* リサイザーバー */}
        <div
          className={`relative w-1 bg-border/10 hover:bg-gradient-to-r hover:from-primary/20 hover:to-primary/30 transition-all duration-300 cursor-col-resize group ${
            isResizing ? 'bg-gradient-to-r from-primary/40 to-primary/60 w-1.5 shadow-lg' : ''
          }`}
          onMouseDown={handleResizeStart}
          style={{
            // クリック領域を広げるために padding を追加
            paddingLeft: '4px',
            paddingRight: '4px',
            marginLeft: '-4px',
            marginRight: '-4px'
          }}
        >
          {/* ホバー時のモダンな視覚的フィードバック */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
            {/* メインハンドル */}
            <div className="relative">
              <div className="w-1 h-12 bg-gradient-to-b from-primary/60 via-primary/80 to-primary/60 rounded-full shadow-xl blur-[0.5px]" />
              <div className="absolute inset-0 w-1 h-12 bg-gradient-to-b from-white/30 via-white/10 to-white/30 rounded-full" />
              {/* グリップドット */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col space-y-0.5">
                <div className="w-0.5 h-0.5 bg-white/60 rounded-full" />
                <div className="w-0.5 h-0.5 bg-white/60 rounded-full" />
                <div className="w-0.5 h-0.5 bg-white/60 rounded-full" />
              </div>
            </div>
          </div>
          
          {/* ドラッグ中のプレミアムフィードバック */}
          {isResizing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* グロー効果 */}
                <div className="absolute inset-0 w-2 h-16 bg-primary/40 rounded-full blur-md animate-pulse" />
                {/* メインバー */}
                <div className="w-1 h-16 bg-gradient-to-b from-primary via-primary/90 to-primary rounded-full shadow-2xl">
                  <div className="absolute inset-0 w-1 h-16 bg-gradient-to-b from-white/40 via-transparent to-white/20 rounded-full" />
                </div>
                {/* 動くグリップドット */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col space-y-1">
                  <div className="w-0.5 h-0.5 bg-white/80 rounded-full animate-pulse" />
                  <div className="w-0.5 h-0.5 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                  <div className="w-0.5 h-0.5 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* タイムライン */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-background/50 backdrop-blur-sm h-full overflow-hidden"
          style={{ width: `${100 - leftPanelWidth}%`, minWidth: '400px' }}
        >
          <div className="p-6 h-full flex flex-col">
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
                  onClick={() => {
                    setCurrentView('focus')
                    // フォーカスモードに切り替え時はスクロール位置をリセットしない（独立したコンテナのため）
                  }}
                  className="ml-4"
                >
                  <Target className="w-4 h-4 mr-2" />
                  フォーカスモード
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <Timeline 
                hasInitialScroll={hasInitialTimelineScroll} 
                setHasInitialScroll={setHasInitialTimelineScroll}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
              />
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* ドラッグオーバーレイ */}
      <DragOverlay 
        style={{ zIndex: 10000 }}
        dropAnimation={{
          duration: 300,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)'
        }}
      >
        {activeTask && (
          <div className="pointer-events-none">
            <DragOverlayCard task={activeTask} />
          </div>
        )}
      </DragOverlay>
      
      {/* AI チャットダイアログ */}
      <AIChatDialog open={showAIChat} onOpenChange={setShowAIChat} />
    </DndContext>
  )
}