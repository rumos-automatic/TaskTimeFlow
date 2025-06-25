'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { TaskPool } from './task-pool'
import { Timeline } from './timeline'
import { FocusMode } from './focus-mode'
import { useViewState } from '@/lib/hooks/use-view-state'
import { 
  ChevronLeft, 
  ChevronRight, 
  ListTodo, 
  Calendar, 
  Target,
  X
} from 'lucide-react'

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0.8
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0.8
  })
}

const swipeConfidenceThreshold = 5000
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity
}

export function WorkspaceNew() {
  const { 
    currentView, 
    viewMode, 
    isMobile, 
    setCurrentView, 
    nextView, 
    prevView 
  } = useViewState()

  const handleDragEnd = (event: any, { offset, velocity }: any) => {
    const swipe = swipePower(offset.x, velocity.x)
    const offsetThreshold = 100 // 100px以上のドラッグでも切り替え

    if (swipe < -swipeConfidenceThreshold || offset.x < -offsetThreshold) {
      nextView()
    } else if (swipe > swipeConfidenceThreshold || offset.x > offsetThreshold) {
      prevView()
    }
  }

  // モバイル版：1画面ずつ表示
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* シンプルヘッダー */}
        <div className="flex items-center justify-center p-4 border-b border-border/40 bg-card/50 backdrop-blur-sm">
          <h1 className="text-lg font-semibold text-foreground">TaskTimeFlow</h1>
        </div>

        {/* スライドビュー */}
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait" custom={0}>
            <motion.div
              key={currentView}
              custom={0}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 500, damping: 40 },
                opacity: { duration: 0.1 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              dragTransition={{ bounceStiffness: 800, bounceDamping: 20 }}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 p-4 pb-24 touch-pan-y"
              style={{ touchAction: 'pan-y' }}
            >
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
            </motion.div>
          </AnimatePresence>
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
      </div>
    )
  }

  // デスクトップ版：フォーカスモード
  if (viewMode === 'desktop-focus') {
    return (
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
    )
  }

  // デスクトップ版：デュアルビュー（タスク + タイムライン）
  return (
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
  )
}