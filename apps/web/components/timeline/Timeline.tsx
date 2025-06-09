'use client'

import { useState, useRef, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { useTimelineView, useTimelineNavigation } from '@/hooks/useTimeline'
import { TimelineHour } from './TimelineHour'
import { TimelineSlotCard } from './TimelineSlotCard'
import { UnscheduledTaskList } from './UnscheduledTaskList'
import { TimelineControls } from './TimelineControls'
import { CreateSlotModal } from './CreateSlotModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  Plus,
  Settings,
  BarChart3,
  RefreshCw
} from 'lucide-react'
import { AIAssistantPopup } from '@/components/ai/AIAssistantPopup'
import { SuggestionsPanel } from '@/components/ai/SuggestionsPanel'
import { generateTimelineHours } from '@/lib/timeline'
import { cn } from '@/lib/utils'
import type { TimelineSlot, TimeBlock } from '@/types/timeline'
import type { Task } from '@/types/tasks'

interface TimelineProps {
  className?: string
  initialDate?: Date
}

export function Timeline({ className, initialDate }: TimelineProps) {
  const navigation = useTimelineNavigation()
  const [currentDate, setCurrentDate] = useState(initialDate || navigation.today)
  const [selectedSlot, setSelectedSlot] = useState<TimelineSlot | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createModalTime, setCreateModalTime] = useState<{ hour: number; minute: number } | null>(null)
  
  const timelineRef = useRef<HTMLDivElement>(null)
  const hourRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  // Fetch timeline data
  const { 
    data: timelineView, 
    isLoading, 
    error, 
    refetch 
  } = useTimelineView(currentDate)

  // Generate timeline hours
  const timelineHours = timelineView ? 
    generateTimelineHours(
      timelineView.time_blocks,
      timelineView.timeline_slots,
      timelineView.settings
    ) : []

  // Scroll to current time on mount
  useEffect(() => {
    const now = new Date()
    if (
      currentDate.toDateString() === now.toDateString() && 
      timelineRef.current &&
      hourRefs.current[now.getHours()]
    ) {
      setTimeout(() => {
        hourRefs.current[now.getHours()]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }, 100)
    }
  }, [currentDate, timelineHours])

  const handleDateNavigation = (direction: 'prev' | 'next' | 'today') => {
    switch (direction) {
      case 'prev':
        setCurrentDate(navigation.navigateToPreviousDay(currentDate))
        break
      case 'next':
        setCurrentDate(navigation.navigateToNextDay(currentDate))
        break
      case 'today':
        setCurrentDate(navigation.navigateToToday())
        break
    }
  }

  const handleTimelineClick = (hour: number, minute: number = 0) => {
    setCreateModalTime({ hour, minute })
    setIsCreateModalOpen(true)
  }

  const handleSlotClick = (slot: TimelineSlot) => {
    setSelectedSlot(slot)
  }

  const handleDragEnd = (result: DropResult) => {
    // Handle drag and drop logic here
    console.log('Drag end:', result)
    // This would typically update the timeline slot positions
  }

  const isToday = currentDate.toDateString() === navigation.today.toDateString()
  const currentHour = new Date().getHours()

  if (isLoading) {
    return <TimelineSkeleton />
  }

  if (error || !timelineView) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          タイムラインの読み込みに失敗しました。ページを再読み込みしてください。
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateNavigation('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant={isToday ? "default" : "outline"}
              onClick={() => handleDateNavigation('today')}
              className="min-w-[120px]"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {isToday ? '今日' : currentDate.toLocaleDateString('ja-JP', { 
                month: 'short', 
                day: 'numeric',
                weekday: 'short'
              })}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateNavigation('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-2xl font-bold text-gray-900">
            {currentDate.toLocaleDateString('ja-JP', { 
              year: 'numeric',
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <AIAssistantPopup 
            tasks={timelineView.unscheduled_tasks}
            selectedDate={currentDate}
            onScheduleApply={(optimizedSchedule) => {
              // Handle applying optimized schedule to timeline
              console.log('Optimized schedule applied:', optimizedSchedule)
            }}
          />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            分析
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            設定
          </Button>
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            タスクを追加
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Unscheduled Tasks Sidebar */}
        <div className="w-80 border-r bg-gray-50 flex flex-col">
          <div className="flex-1">
            <UnscheduledTaskList 
              tasks={timelineView.unscheduled_tasks}
              onTaskClick={(task) => console.log('Task clicked:', task)}
            />
          </div>
          
          {/* AI Suggestions Panel */}
          <div className="p-4 border-t">
            <SuggestionsPanel 
              tasks={timelineView.unscheduled_tasks}
              context={{
                current_date: currentDate.toISOString(),
                view_mode: 'timeline',
                scheduled_slots: timelineView.timeline_slots
              }}
              className="max-h-60"
              autoRefresh={true}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 flex flex-col">
          <TimelineControls 
            date={currentDate}
            settings={timelineView.settings}
            onSettingsChange={(settings) => console.log('Settings changed:', settings)}
            tasks={timelineView.unscheduled_tasks}
            onScheduleApply={(optimizedSchedule) => {
              // Handle applying optimized schedule to timeline
              console.log('Optimized schedule applied from controls:', optimizedSchedule)
            }}
          />
          
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full" ref={timelineRef}>
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="relative">
                  {timelineHours.map((hour) => (
                    <div
                      key={hour.hour}
                      ref={el => hourRefs.current[hour.hour] = el}
                      className={cn(
                        'relative border-b border-gray-200 transition-all duration-200',
                        isToday && hour.hour === currentHour && 'bg-tasktime-50 border-tasktime-200'
                      )}
                    >
                      <TimelineHour
                        hour={hour}
                        isCurrentHour={isToday && hour.hour === currentHour}
                        onClick={(minute) => handleTimelineClick(hour.hour, minute)}
                        onSlotClick={handleSlotClick}
                      />
                    </div>
                  ))}
                  
                  {/* Current Time Indicator */}
                  {isToday && (
                    <CurrentTimeIndicator />
                  )}
                </div>
              </DragDropContext>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateSlotModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setCreateModalTime(null)
        }}
        date={currentDate}
        initialTime={createModalTime}
        availableTasks={timelineView.unscheduled_tasks}
      />
    </div>
  )
}

function CurrentTimeIndicator() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  const hour = currentTime.getHours()
  const minute = currentTime.getMinutes()
  const topOffset = (hour * 120) + (minute * 2) // 120px per hour, 2px per minute

  return (
    <div 
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top: `${topOffset}px` }}
    >
      <div className="flex items-center">
        <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-l font-medium">
          {currentTime.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
        <div className="flex-1 h-0.5 bg-red-500"></div>
      </div>
    </div>
  )
}

function TimelineSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-9" />
          </div>
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex flex-1">
        <div className="w-80 border-r p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
        
        <div className="flex-1 p-4">
          <div className="space-y-1">
            {[...Array(24)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 h-20">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-16 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Timeline