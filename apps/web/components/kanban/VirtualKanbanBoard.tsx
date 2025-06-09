'use client'

import { useMemo, useCallback, useState } from 'react'
import { VirtualList } from '@/components/ui/virtual-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, MoreVertical, Filter, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskCard } from './TaskCard'
import type { Task } from '@/types/tasks'

interface KanbanColumn {
  id: string
  title: string
  status: string
  color?: string
  tasks: Task[]
  maxTasks?: number
}

interface VirtualKanbanBoardProps {
  columns: KanbanColumn[]
  onTaskMove?: (taskId: string, fromColumn: string, toColumn: string) => void
  onTaskClick?: (task: Task) => void
  onCreateTask?: (columnId: string) => void
  taskHeight?: number
  containerHeight?: number
  className?: string
  showTaskCount?: boolean
}

export function VirtualKanbanBoard({
  columns,
  onTaskMove,
  onTaskClick,
  onCreateTask,
  taskHeight = 120,
  containerHeight = 600,
  className,
  showTaskCount = true
}: VirtualKanbanBoardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  // Filter tasks based on search and filters
  const filteredColumns = useMemo(() => {
    return columns.map(column => ({
      ...column,
      tasks: column.tasks.filter(task => {
        const matchesSearch = !searchTerm || 
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesPriority = !filterPriority || task.priority === filterPriority
        
        return matchesSearch && matchesPriority
      })
    }))
  }, [columns, searchTerm, filterPriority])

  const handleDragStart = useCallback((task: Task) => {
    setDraggedTask(task)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedTask(null)
  }, [])

  const handleDrop = useCallback((columnId: string) => {
    if (draggedTask && onTaskMove) {
      const currentColumn = columns.find(col => 
        col.tasks.some(task => task.id === draggedTask.id)
      )
      
      if (currentColumn && currentColumn.id !== columnId) {
        onTaskMove(draggedTask.id, currentColumn.id, columnId)
      }
    }
    setDraggedTask(null)
  }, [draggedTask, columns, onTaskMove])

  return (
    <div className={cn('h-full flex flex-col bg-gray-50', className)}>
      {/* Header with filters */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">かんばんボード</h2>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="タスクを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Priority filter */}
          <select
            value={filterPriority || ''}
            onChange={(e) => setFilterPriority(e.target.value || null)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての優先度</option>
            <option value="urgent">緊急</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            フィルター
          </Button>
          <Button variant="outline" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 flex overflow-x-auto p-4 space-x-4">
        {filteredColumns.map((column) => (
          <VirtualKanbanColumn
            key={column.id}
            column={column}
            taskHeight={taskHeight}
            containerHeight={containerHeight - 120} // Account for header
            onTaskClick={onTaskClick}
            onCreateTask={onCreateTask}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            showTaskCount={showTaskCount}
            isDraggedOver={draggedTask !== null}
          />
        ))}
      </div>
    </div>
  )
}

interface VirtualKanbanColumnProps {
  column: KanbanColumn
  taskHeight: number
  containerHeight: number
  onTaskClick?: (task: Task) => void
  onCreateTask?: (columnId: string) => void
  onDrop: (columnId: string) => void
  onDragStart: (task: Task) => void
  onDragEnd: () => void
  showTaskCount: boolean
  isDraggedOver: boolean
}

function VirtualKanbanColumn({
  column,
  taskHeight,
  containerHeight,
  onTaskClick,
  onCreateTask,
  onDrop,
  onDragStart,
  onDragEnd,
  showTaskCount,
  isDraggedOver
}: VirtualKanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    onDrop(column.id)
  }, [column.id, onDrop])

  const renderTask = useCallback((task: Task, index: number, style: React.CSSProperties) => {
    return (
      <div style={style} className="p-2">
        <TaskCard
          task={task}
          onClick={() => onTaskClick?.(task)}
          onDragStart={() => onDragStart(task)}
          onDragEnd={onDragEnd}
          className="h-full cursor-pointer hover:shadow-md transition-shadow"
          draggable
        />
      </div>
    )
  }, [onTaskClick, onDragStart, onDragEnd])

  const getTaskKey = useCallback((task: Task, index: number) => task.id, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 border-gray-300'
      case 'in_progress': return 'bg-blue-100 border-blue-300'
      case 'review': return 'bg-yellow-100 border-yellow-300'
      case 'completed': return 'bg-green-100 border-green-300'
      default: return 'bg-gray-100 border-gray-300'
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col w-80 bg-white rounded-lg border-2 transition-all',
        isDragOver && 'border-blue-400 bg-blue-50',
        getStatusColor(column.status)
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center space-x-2">
            <span>{column.title}</span>
            {showTaskCount && (
              <Badge variant="outline" className="text-xs">
                {column.tasks.length}
                {column.maxTasks && ` / ${column.maxTasks}`}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCreateTask?.(column.id)}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Tasks list with virtual scrolling */}
      <CardContent className="flex-1 p-0">
        {column.tasks.length > 0 ? (
          <VirtualList
            items={column.tasks}
            itemHeight={taskHeight + 16} // Add padding
            containerHeight={containerHeight - 80} // Account for header
            renderItem={renderTask}
            getItemKey={getTaskKey}
            overscan={2}
            className="px-2"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <div className="text-sm">タスクがありません</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCreateTask?.(column.id)}
              className="mt-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              タスクを追加
            </Button>
          </div>
        )}
      </CardContent>

      {/* Drop zone indicator */}
      {isDraggedOver && (
        <div className={cn(
          'absolute inset-0 border-2 border-dashed rounded-lg pointer-events-none transition-opacity',
          isDragOver ? 'border-blue-400 bg-blue-50/50 opacity-100' : 'opacity-0'
        )}>
          <div className="flex items-center justify-center h-full">
            <div className="text-blue-600 font-medium">ここにドロップ</div>
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for managing kanban state with performance optimizations
export function useVirtualKanban(tasks: Task[]) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [filterLabels, setFilterLabels] = useState<string[]>([])

  // Memoized columns with filtered tasks
  const columns = useMemo(() => {
    const columnConfig = [
      { id: 'todo', title: 'To Do', status: 'todo' },
      { id: 'in_progress', title: 'In Progress', status: 'in_progress' },
      { id: 'review', title: 'Review', status: 'review' },
      { id: 'completed', title: 'Completed', status: 'completed' }
    ]

    return columnConfig.map(config => {
      const columnTasks = tasks
        .filter(task => task.status === config.status)
        .filter(task => {
          const matchesSearch = !searchTerm || 
            task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchTerm.toLowerCase())
          
          const matchesPriority = !filterPriority || task.priority === filterPriority
          
          const matchesLabels = filterLabels.length === 0 || 
            filterLabels.some(label => task.labels?.includes(label))
          
          return matchesSearch && matchesPriority && matchesLabels
        })
        .sort((a, b) => {
          // Sort by priority and creation date
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          const aPriority = priorityOrder[a.priority] || 0
          const bPriority = priorityOrder[b.priority] || 0
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority
          }
          
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

      return {
        ...config,
        tasks: columnTasks
      }
    })
  }, [tasks, searchTerm, filterPriority, filterLabels])

  return {
    columns,
    searchTerm,
    setSearchTerm,
    filterPriority,
    setFilterPriority,
    filterLabels,
    setFilterLabels
  }
}

export default VirtualKanbanBoard