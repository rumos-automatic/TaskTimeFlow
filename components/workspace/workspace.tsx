'use client'

import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TaskPool } from './task-pool'
import { Timeline } from './timeline'
import { FocusMode } from './focus-mode'

export function Workspace() {
  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Task Pool - Left Panel */}
      <div className="w-1/4 min-w-[320px] border-r border-border/40 bg-card/50 backdrop-blur-sm">
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
      </div>

      <Separator orientation="vertical" className="w-px" />

      {/* Timeline - Center Panel */}
      <div className="flex-1 bg-background/50 backdrop-blur-sm">
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
            </div>
          </div>
          <Timeline />
        </div>
      </div>

      <Separator orientation="vertical" className="w-px" />

      {/* Focus Mode - Right Panel */}
      <div className="w-1/4 min-w-[320px] border-l border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="p-6 h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">フォーカス</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <span className="text-xs text-muted-foreground">準備完了</span>
            </div>
          </div>
          <FocusMode />
        </div>
      </div>
    </div>
  )
}