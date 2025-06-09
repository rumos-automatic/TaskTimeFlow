'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { useTasks, useTaskDragDrop } from '@/hooks/useTasks'
import { useProject } from '@/hooks/useProjects'
import { TaskCard } from './TaskCard'
import { CreateTaskModal } from './CreateTaskModal'
import { TaskDetailsModal } from './TaskDetailsModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Filter, Search, Settings } from 'lucide-react'
import { AIAssistantPopup } from '@/components/ai/AIAssistantPopup'
import { SuggestionsPanel } from '@/components/ai/SuggestionsPanel'
import type { Task, KanbanColumn, DragDropResult } from '@/types/tasks'

interface KanbanBoardProps {
  projectId: string
  className?: string
}

export function KanbanBoard({ projectId, className }: KanbanBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createModalColumn, setCreateModalColumn] = useState<string>('todo')

  // Fetch project and tasks data
  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId)
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useTasks(projectId)
  const dragDropMutation = useTaskDragDrop()

  // Group tasks by status
  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = []
    }
    acc[task.status].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  // Sort tasks by position within each column
  Object.keys(tasksByStatus).forEach(status => {
    tasksByStatus[status].sort((a, b) => a.position - b.position)
  })

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, reason } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    // Convert DropResult to DragDropResult for mutation
    const dragDropResult: DragDropResult = {
      draggableId,
      type: 'task', // assuming task type
      source,
      destination,
      reason: reason as 'DROP' | 'CANCEL'
    }

    dragDropMutation.mutate(dragDropResult)
  }

  const handleCreateTask = (columnId: string) => {
    setCreateModalColumn(columnId)
    setIsCreateModalOpen(true)
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
  }

  if (projectLoading) {
    return <KanbanBoardSkeleton />
  }

  if (projectError || !project) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          プロジェクトの読み込みに失敗しました。ページを再読み込みしてください。
        </AlertDescription>
      </Alert>
    )
  }

  if (tasksError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          タスクの読み込みに失敗しました。ページを再読み込みしてください。
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="text-gray-600 mt-1">{project.description}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <AIAssistantPopup 
            tasks={tasks}
            selectedDate={new Date()}
          />
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            フィルター
          </Button>
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            検索
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            設定
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex space-x-6 overflow-x-auto pb-6">
          {project.kanban_columns.map((column: KanbanColumn) => {
            const columnTasks = tasksByStatus[column.id] || []
            
            return (
              <div key={column.id} className="flex-shrink-0 w-80">
                <Card className="glass-card h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <span className="mr-2">{column.icon}</span>
                        {column.name}
                        <Badge variant="secondary" className="ml-2">
                          {columnTasks.length}
                        </Badge>
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCreateTask(column.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <Droppable droppableId={`column-${column.id}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[200px] transition-colors ${
                            snapshot.isDraggingOver ? 'bg-tasktime-50 rounded-lg' : ''
                          }`}
                        >
                          <ScrollArea className="h-[calc(100vh-300px)]">
                            <div className="space-y-3 pr-4">
                              {columnTasks.map((task, index) => (
                                <Draggable
                                  key={task.id}
                                  draggableId={task.id}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      style={provided.draggableProps.style}
                                      className={`transition-transform ${
                                        snapshot.isDragging ? 'rotate-2 scale-105' : ''
                                      }`}
                                      onClick={() => handleTaskClick(task)}
                                    >
                                      <TaskCard 
                                        task={task} 
                                        isDragging={snapshot.isDragging}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                            </div>
                            {provided.placeholder}
                          </ScrollArea>
                          
                          {columnTasks.length === 0 && !tasksLoading && (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                              <Plus className="h-8 w-8 mb-2 opacity-50" />
                              <p className="text-sm">タスクがありません</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                                onClick={() => handleCreateTask(column.id)}
                              >
                                タスクを追加
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={projectId}
        defaultStatus={createModalColumn}
      />

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Loading overlay */}
      {dragDropMutation.isPending && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-tasktime-500"></div>
              <span className="text-sm">更新中...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KanbanBoardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      {/* Board skeleton */}
      <div className="flex space-x-6 overflow-x-auto">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-80">
            <Card className="glass-card">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-24 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}

export default KanbanBoard