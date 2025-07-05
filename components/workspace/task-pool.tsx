'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import type { ReactElement } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Circle, Clock, AlertCircle, X, Edit2, Trash2, MoreVertical, Check, RotateCcw, ChevronDown, ChevronUp, Settings, ChevronLeft, ChevronRight, Copy, FileText, ArrowUpDown, GripVertical, TrendingDown, TrendingUp, Zap, CalendarPlus, CalendarMinus, Timer, Hourglass, SortAsc, SortDesc, CalendarDays, ListChecks } from 'lucide-react'
import { useTaskStoreWithAuth } from '@/lib/hooks/use-task-store-with-auth'
import { useAuth } from '@/lib/auth/auth-context'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Task, Priority, Urgency, TaskCategory, CategoryFilter } from '@/lib/types'
import { useViewState } from '@/lib/hooks/use-view-state'
import { useCategoryStoreWithAuth } from '@/lib/hooks/use-category-store-with-auth'
import { BUILT_IN_CATEGORIES } from '@/lib/store/use-category-store'
import { CategoryManagement } from './category-management'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { TaskDetailModal } from './task-detail-modal'
import { TaskPoolAddForm, BaseTaskForm, TaskFormData } from '@/components/ui/task-form'
import { useTaskSort, SORT_OPTIONS } from '@/lib/hooks/use-task-sort'
import { getDueDateInfo, formatDueDateForInput } from '@/lib/utils/date-helpers'
import { useUserSettings } from '@/lib/hooks/use-user-settings'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const priorityColors: Record<Priority, string> = {
  high: 'border-red-500 bg-red-50 dark:bg-red-950/20',
  low: 'border-green-500 bg-green-50 dark:bg-green-950/20'
}

const urgencyColors: Record<Urgency, string> = {
  high: 'border-r-red-500 border-r-4',
  low: 'border-r-blue-500 border-r-4'
}

const urgencyBadges: Record<Urgency, { icon: ReactElement; color: string; label: string }> = {
  high: { icon: <AlertCircle className="w-3 h-3" />, color: 'text-red-500', label: '高' },
  low: { icon: <Circle className="w-3 h-3" />, color: 'text-blue-500', label: '低' }
}

interface DraggableTaskCardProps {
  task: Task
  onDragStart?: () => void
  onDragEnd?: () => void
  isSelectionMode?: boolean
  isSelected?: boolean
  onToggleSelection?: (taskId: string) => void
}

// タスクカードの詳細な比較関数
const areTaskCardsEqual = (prevProps: DraggableTaskCardProps, nextProps: DraggableTaskCardProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.task.urgency === nextProps.task.urgency &&
    prevProps.task.category === nextProps.task.category &&
    prevProps.task.estimatedTime === nextProps.task.estimatedTime &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.scheduledDate === nextProps.task.scheduledDate &&
    prevProps.task.scheduledTime === nextProps.task.scheduledTime &&
    prevProps.task.notes === nextProps.task.notes &&
    prevProps.task.dueDate === nextProps.task.dueDate &&
    prevProps.onDragStart === nextProps.onDragStart &&
    prevProps.onDragEnd === nextProps.onDragEnd &&
    prevProps.isSelectionMode === nextProps.isSelectionMode &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onToggleSelection === nextProps.onToggleSelection
  )
}

const DraggableTaskCard = React.memo(function DraggableTaskCard({ 
  task, 
  onDragStart, 
  onDragEnd, 
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection
}: DraggableTaskCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const { updateTask, deleteTask, completeTask, addTask } = useTaskStoreWithAuth()
  const { user } = useAuth()
  
  // スケジュール済みタスクの場合は、IDにプレフィックスを追加してユニークにする（メモ化）
  const draggableId = React.useMemo(() => 
    task.scheduledDate ? `pool-${task.id}` : task.id,
    [task.id, task.scheduledDate]
  )
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: draggableId,
    data: {
      onDragStart,
      onDragEnd
    },
    disabled: isSelectionMode // 選択モード時はドラッグを無効化
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}分`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`
  }

  const handleEdit = () => {
    setIsEditing(true)
    setShowActions(false)
  }

  const handleDelete = () => {
    deleteTask(task.id)
    setShowActions(false)
  }

  const handleComplete = () => {
    completeTask(task.id)
    setShowActions(false)
  }

  const handleCopy = async () => {
    if (!user) return
    
    await addTask({
      title: task.title,
      priority: task.priority,
      urgency: task.urgency,
      category: task.category,
      estimatedTime: task.estimatedTime,
      status: 'todo'
    }, user.id)
    
    setShowActions(false)
  }


  if (isEditing) {
    return (
      <EditTaskCard 
        task={task} 
        onSave={(updatedTask) => {
          updateTask(task.id, updatedTask)
          setIsEditing(false)
        }}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={`p-4 transition-all hover:shadow-md group relative ${
          priorityColors[task.priority]
        } ${urgencyColors[task.urgency]} ${
          isSelected ? 'ring-2 ring-primary' : ''
        }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div 
          {...(!isSelectionMode ? listeners : {})}
          {...attributes}
          className="flex items-start justify-between relative w-full"
        >
          {/* チェックボックス（選択モード時のみ表示） */}
          {isSelectionMode && (
            <div className="mr-3 flex items-center">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelection?.(task.id)}
                className="mt-0.5"
              />
            </div>
          )}
          <div className="flex-1">
            <h4 
              className="font-medium text-sm mb-2 cursor-pointer hover:text-primary transition-colors"
              onClick={() => setShowDetail(true)}
            >
              {task.title}
            </h4>
            <div className="flex items-center space-x-2 text-xs">
              {/* 優先度バッジ */}
              <div className={`px-2 py-1 rounded-full font-medium ${
                task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              }`}>
                優先度：{task.priority === 'high' ? '高' : '低'}
              </div>
              {/* 緊急度バッジ */}
              <div className={`px-2 py-1 rounded-full font-medium ${
                task.urgency === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              }`}>
                緊急度：{task.urgency === 'high' ? '高' : '低'}
              </div>
              {/* 時間表示 */}
              <div className="flex items-center space-x-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{formatTime(task.estimatedTime)}</span>
              </div>
              {/* メモアイコン */}
              {task.notes && (
                <div className="flex items-center space-x-1 text-amber-600" title="メモあり">
                  <FileText className="w-3 h-3" />
                  <span className="text-xs">メモ</span>
                </div>
              )}
              {/* 期限表示 */}
              {(() => {
                const dueDateInfo = getDueDateInfo(task.dueDate)
                if (!dueDateInfo) return null
                return (
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${dueDateInfo.colorClass}`}>
                    <CalendarDays className="w-3 h-3" />
                    <span>{dueDateInfo.text}</span>
                  </div>
                )
              })()}
              {/* スケジュール表示 */}
              {task.scheduledDate && task.scheduledTime && (
                <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  <Clock className="w-3 h-3" />
                  <span>
                    {new Date(task.scheduledDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} {task.scheduledTime}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* アクションボタン（選択モード時は非表示） */}
          {showActions && !isSelectionMode && (
            <div className="flex space-x-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900 text-green-600"
                onClick={handleComplete}
              >
                <Check className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-600"
                onClick={handleCopy}
                title="タスクをコピー"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                onClick={handleEdit}
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900 text-red-600"
                onClick={handleDelete}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </Card>
      <TaskDetailModal
        task={task}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onSave={(taskId, updates) => {
          updateTask(taskId, updates)
          setShowDetail(false)
        }}
      />
    </div>
  )
}, areTaskCardsEqual)

interface CompletedTaskCardProps {
  task: Task
}

const CompletedTaskCard = React.memo(function CompletedTaskCard({ task }: CompletedTaskCardProps) {
  const [showActions, setShowActions] = useState(false)
  const { uncompleteTask } = useTaskStoreWithAuth()
  
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}分`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleUncomplete = () => {
    uncompleteTask(task.id)
    setShowActions(false)
  }

  return (
    <Card 
      className="p-3 border-border bg-muted/30 opacity-75 group hover:opacity-90 transition-opacity"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <Check className="w-4 h-4 text-green-600" />
            <h4 className="font-medium text-sm line-through text-muted-foreground">{task.title}</h4>
          </div>
          <div className="flex items-center space-x-2 text-xs opacity-60">
            {/* 優先度バッジ（完了済み） */}
            <div className={`px-1.5 py-0.5 rounded text-xs ${
              task.priority === 'high' ? 'bg-red-100 text-red-600' :
              'bg-green-100 text-green-600'
            }`}>
              優先度：{task.priority === 'high' ? '高' : '低'}
            </div>
            {/* 緊急度バッジ（完了済み） */}
            <div className={`px-1.5 py-0.5 rounded text-xs ${
              task.urgency === 'high' ? 'bg-red-100 text-red-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              緊急度：{task.urgency === 'high' ? '高' : '低'}
            </div>
            {/* 時間表示 */}
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatTime(task.estimatedTime)}</span>
            </div>
            {task.completedAt && (
              <span>完了: {formatDate(task.completedAt)}</span>
            )}
          </div>
        </div>
        
        {/* アクションボタン */}
        {showActions && (
          <div className="flex space-x-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600"
              onClick={handleUncomplete}
              title="未完了に戻す"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
})

interface EditTaskCardProps {
  task: Task
  onSave: (task: Partial<Task>) => void
  onCancel: () => void
}

const EditTaskCard = React.memo(function EditTaskCard({ task, onSave, onCancel }: EditTaskCardProps) {
  const { allCategories } = useCategoryStoreWithAuth()

  const handleSubmit = (formData: TaskFormData) => {
    const finalData = {
      title: formData.title,
      priority: formData.priority,
      urgency: formData.urgency,
      category: formData.category,
      estimatedTime: formData.estimatedTime === '' ? 30 : formData.estimatedTime,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined
    }
    onSave(finalData)
  }

  return (
    <Card className="border-primary">
      <BaseTaskForm
        defaultValues={{
          title: task.title,
          priority: task.priority,
          urgency: task.urgency,
          category: task.category,
          estimatedTime: task.estimatedTime,
          dueDate: formatDueDateForInput(task.dueDate)
        }}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        categories={allCategories}
        variant="compact"
        size="sm"
        submitLabel="保存"
      />
    </Card>
  )
})

interface AddTaskFormProps {
  defaultCategory?: CategoryFilter
}

const AddTaskForm = React.memo(function AddTaskForm({ defaultCategory }: AddTaskFormProps) {
  const { user } = useAuth()
  const { addTask } = useTaskStoreWithAuth()
  const { allCategories } = useCategoryStoreWithAuth()
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = async (formData: TaskFormData) => {
    if (!user) return

    const taskData = {
      title: formData.title,
      priority: formData.priority,
      urgency: formData.urgency,
      category: formData.category,
      estimatedTime: formData.estimatedTime === '' ? 30 : formData.estimatedTime,
      status: 'todo' as const,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined
    }

    await addTask(taskData, user.id)
    setShowForm(false)
  }

  if (showForm) {
    return (
      <Card className="border-dashed border-primary">
        <TaskPoolAddForm
          defaultValues={{
            category: defaultCategory && defaultCategory !== 'all' ? defaultCategory : 'work'
          }}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          categories={allCategories}
          submitLabel="追加"
        />
      </Card>
    )
  }

  return (
    <Button 
      className="w-full" 
      variant="outline" 
      onClick={() => setShowForm(true)}
    >
      <Plus className="w-4 h-4 mr-2" />
      新しいタスクを追加
    </Button>
  )
})

interface TaskPoolProps {
  onDragStart?: () => void
  onDragEnd?: () => void
}

// ソート順に応じたアイコンを返す関数
function getSortIcon(sortOrder: string) {
  switch (sortOrder) {
    case 'custom':
      return <GripVertical className="w-4 h-4" />
    case 'priority-desc':
      return <TrendingDown className="w-4 h-4" />
    case 'priority-asc':
      return <TrendingUp className="w-4 h-4" />
    case 'urgency-desc':
      return <Zap className="w-4 h-4" />
    case 'urgency-asc':
      return <Circle className="w-4 h-4" />
    case 'created-desc':
      return <CalendarPlus className="w-4 h-4" />
    case 'created-asc':
      return <CalendarMinus className="w-4 h-4" />
    case 'time-asc':
      return <Timer className="w-4 h-4" />
    case 'time-desc':
      return <Hourglass className="w-4 h-4" />
    case 'title-asc':
      return <SortAsc className="w-4 h-4" />
    case 'title-desc':
      return <SortDesc className="w-4 h-4" />
    default:
      return <ArrowUpDown className="w-4 h-4" />
  }
}

export function TaskPool({ onDragStart, onDragEnd }: TaskPoolProps = {}) {
  const { 
    tasks, 
    getTasksByCategory,
    getUnscheduledTasks,
    getCompletedTasks,
    getAllActiveTasks,
    removeDuplicateTasks,
    resetMigrationStatus,
    hideCompletedTask,
    clearHiddenCompletedTasks,
    reorderTasks,
    completeTask,
    deleteTask
  } = useTaskStoreWithAuth()
  
  const { 
    allCategories, 
    selectedCategory, 
    setSelectedCategory,
    googleTasksSync 
  } = useCategoryStoreWithAuth()
  
  const { settings } = useUserSettings()
  
  // 設定値をメモ化して不要な再レンダリングを防ぐ
  const showScheduledTasksInPool = React.useMemo(() => settings.showScheduledTasksInPool, [settings.showScheduledTasksInPool])
  
  const [showDebugMenu, setShowDebugMenu] = useState(false)
  
  // 選択モードの状態管理
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  
  // カテゴリ選択のハンドラをメモ化
  const handleSelectAllCategory = React.useCallback(() => setSelectedCategory('all'), [setSelectedCategory])
  const handleSelectCategory = React.useCallback((categoryId: string) => () => setSelectedCategory(categoryId), [setSelectedCategory])
  
  // タスク選択のハンドラ
  const toggleTaskSelection = React.useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }, [])


  const { setNodeRef, isOver } = useDroppable({
    id: 'task-pool'
  })

  // 完了済みタスクの折りたたみ状態管理（デフォルト：折りたたみ）
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('task-pool-completed-collapsed')
      return saved ? JSON.parse(saved) : true
    }
    return true
  })

  // 折りたたみ状態をローカルストレージに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('task-pool-completed-collapsed', JSON.stringify(isCompletedCollapsed))
    }
  }, [isCompletedCollapsed])

  // タスクを直接フィルタリングして安定した参照を保つ
  const activeTasks = React.useMemo(() => {
    if (showScheduledTasksInPool) {
      return tasks.filter(task => task.status !== 'completed')
    } else {
      return tasks.filter(task => !task.scheduledDate && task.status !== 'completed')
    }
  }, [showScheduledTasksInPool, tasks])
  
  // 隠された完了済みタスクのIDをメモ化（localStorageアクセスを減らす）
  const hiddenCompletedTaskIds = React.useMemo(() => {
    try {
      const hiddenStr = localStorage.getItem('hidden_completed_tasks')
      return hiddenStr ? JSON.parse(hiddenStr) : []
    } catch {
      return []
    }
  }, []) // 初回のみ実行
  
  // 完了済みタスクのフィルタリング（隠されたタスクを除外）
  const completedTasks = React.useMemo(() => {
    return tasks.filter(task => 
      task.status === 'completed' && !hiddenCompletedTaskIds.includes(task.id)
    )
  }, [tasks, hiddenCompletedTaskIds])
  
  const baseFilteredTasks = React.useMemo(() => 
    selectedCategory === 'all' 
      ? activeTasks 
      : activeTasks.filter(task => task.category === selectedCategory),
    [selectedCategory, activeTasks]
  )
  
  const filteredCompletedTasks = React.useMemo(() =>
    selectedCategory === 'all'
      ? completedTasks
      : completedTasks.filter(task => task.category === selectedCategory),
    [selectedCategory, completedTasks]
  )

  // ソート機能を適用
  const { 
    sortedTasks: filteredTasks, 
    sortOrder, 
    setSortOrder, 
    loading: sortLoading,
    onDragStart: onSortDragStart,
    onDragEnd: onSortDragEnd 
  } = useTaskSort(baseFilteredTasks, selectedCategory !== 'all' ? selectedCategory : undefined)
  
  // ドラッグイベントの統合
  const handleDragStart = React.useCallback(() => {
    onSortDragStart()
    onDragStart?.()
  }, [onSortDragStart, onDragStart])
  
  const handleDragEnd = React.useCallback(() => {
    onSortDragEnd()
    onDragEnd?.()
  }, [onSortDragEnd, onDragEnd])
  
  // SortableContext用のitems配列をメモ化
  const sortableItems = React.useMemo(() => 
    filteredTasks.map(task => task.scheduledDate ? `pool-${task.id}` : task.id),
    [filteredTasks]
  )

  return (
    <div 
      ref={setNodeRef}
      className={`space-y-3 h-full flex flex-col transition-colors pb-0 ${
        isOver ? 'bg-muted/20' : ''
      }`}
    >
      {/* Dynamic Category Tabs */}
      <div className="space-y-2">
        {/* Main tab row with category management */}
        {React.useMemo(() => (
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 overflow-hidden">
              <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-1">
                {/* All tab */}
                <Button 
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm" 
                  className="flex-shrink-0"
                  onClick={handleSelectAllCategory}
                >
                  すべて
                </Button>
                
                {/* Built-in and custom category tabs */}
                {allCategories.map((category) => {
                  const isGoogleTasks = category.id === 'google-tasks'
                  const isSelected = selectedCategory === category.id
                  
                  return (
                    <Button 
                      key={category.id}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm" 
                      className="flex-shrink-0 flex items-center space-x-1"
                      onClick={handleSelectCategory(category.id)}
                    >
                      {/* Category indicator */}
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm">{category.icon}</span>
                      <span>{category.name}</span>
                      
                      {/* Google Tasks sync indicator */}
                      {isGoogleTasks && (
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          googleTasksSync.syncStatus === 'syncing' 
                            ? 'bg-yellow-500 animate-pulse' 
                            : googleTasksSync.syncStatus === 'error'
                            ? 'bg-red-500'
                            : googleTasksSync.isEnabled
                            ? 'bg-green-500'
                            : 'bg-gray-400'
                        }`} />
                      )}
                    </Button>
                  )
                })}
              </div>
            </div>
            
            {/* Category management button */}
            <CategoryManagement>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex-shrink-0 h-8 w-8 p-0"
                title="カテゴリ管理"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </CategoryManagement>
          </div>
        ), [selectedCategory, handleSelectAllCategory, handleSelectCategory, allCategories, googleTasksSync])}
        
        {/* Category info row */}
        {selectedCategory !== 'all' && (() => {
          const category = allCategories.find(c => c.id === selectedCategory)
          if (!category) return null
          
          return (
            <div className="flex items-center space-x-2 px-2 py-1 bg-muted/30 rounded-sm">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-lg">{category.icon}</span>
              <span className="text-sm font-medium">{category.name}</span>
              {category.description && (
                <span className="text-xs text-muted-foreground">- {category.description}</span>
              )}
              {category.id === 'google-tasks' && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <span>•</span>
                  <span>
                    {googleTasksSync.syncStatus === 'syncing' 
                      ? '同期中...' 
                      : googleTasksSync.syncStatus === 'error'
                      ? 'エラー'
                      : googleTasksSync.isEnabled
                      ? '同期済み'
                      : '未同期'
                    }
                  </span>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      <Separator />

      {/* Debug Menu (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebugMenu(!showDebugMenu)}
              className="w-full text-xs"
            >
              🔧 デバッグメニュー ({tasks.length}個のタスク)
            </Button>
            
            {showDebugMenu && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (confirm('重複タスクを削除しますか？この操作は元に戻せません。')) {
                        await removeDuplicateTasks()
                      }
                    }}
                    className="text-xs"
                  >
                    🗑️ 重複タスク削除
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const completedTasks = tasks.filter(task => task.status === 'completed')
                      if (completedTasks.length === 0) {
                        alert('完了済みタスクがありません')
                        return
                      }
                      if (confirm(`完了済みタスク${completedTasks.length}個をプールから非表示にしますか？\n（カレンダーには残ります）`)) {
                        completedTasks.forEach(task => hideCompletedTask(task.id))
                      }
                    }}
                    className="text-xs"
                  >
                    👁️‍🗨️ 完了済みタスクを非表示
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('マイグレーション状態をリセットしますか？')) {
                        resetMigrationStatus()
                      }
                    }}
                    className="text-xs"
                  >
                    🔄 マイグレーション状態リセット
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('非表示にした完了済みタスクを全て表示しますか？')) {
                        clearHiddenCompletedTasks()
                      }
                    }}
                    className="text-xs"
                  >
                    👁️ 非表示タスクを復元
                  </Button>
                  
                  <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                    <p>⚠️ 開発用機能</p>
                    <p>• 重複削除: 同じタイトルのタスクで古いものを削除</p>
                    <p>• 完了済み非表示: プールから隠す（カレンダーには残る）</p>
                    <p>• マイグレーション状態リセット: 次回ログイン時に再マイグレーション</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          
          <Separator />
        </>
      )}

      {/* Add Task Form, Sort and Selection Mode */}
      <div className="flex items-center gap-2">
        {/* Sort dropdown - icon only */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 flex-shrink-0"
              title={SORT_OPTIONS.find(opt => opt.value === sortOrder)?.label}
            >
              {getSortIcon(sortOrder)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setSortOrder(option.value)}
                className="gap-2"
              >
                {getSortIcon(option.value)}
                <span>{option.label}</span>
                {sortOrder === option.value && (
                  <Check className="w-4 h-4 ml-auto" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Selection Mode Button */}
        <Button
          variant={isSelectionMode ? "default" : "outline"}
          size="icon"
          className="h-10 w-10 flex-shrink-0"
          title="選択モード"
          onClick={() => {
            setIsSelectionMode(!isSelectionMode)
            setSelectedTaskIds(new Set()) // 選択をクリア
          }}
        >
          <ListChecks className="w-4 h-4" />
        </Button>
        
        {/* Add Task Button */}
        <div className="flex-1">
          <AddTaskForm defaultCategory={selectedCategory} />
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-0">
        <SortableContext 
          items={sortableItems} 
          strategy={verticalListSortingStrategy}
        >
          {filteredTasks.map((task) => (
            <DraggableTaskCard 
              key={task.id} 
              task={task} 
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              isSelectionMode={isSelectionMode}
              isSelected={selectedTaskIds.has(task.id)}
              onToggleSelection={toggleTaskSelection}
            />
          ))}
        </SortableContext>
        
        {filteredTasks.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            タスクがありません
          </div>
        )}

        {/* Completed Tasks Section */}
        {filteredCompletedTasks.length > 0 && (
          <div className="pt-4 mb-0">
            <Separator />
            
            {/* Collapsible Header */}
            <button
              onClick={() => setIsCompletedCollapsed(!isCompletedCollapsed)}
              className="flex items-center justify-between w-full py-3 text-left hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors group"
            >
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  完了済み ({filteredCompletedTasks.length})
                </h3>
                {filteredCompletedTasks.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`完了済みタスク${filteredCompletedTasks.length}個をプールから非表示にしますか？\n（カレンダーには残ります）`)) {
                        filteredCompletedTasks.forEach(task => hideCompletedTask(task.id))
                      }
                    }}
                    className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
                    title="完了済みタスクを非表示"
                  >
                    👁️‍🗨️
                  </Button>
                )}
              </div>
              <motion.div
                animate={{ rotate: isCompletedCollapsed ? 0 : 180 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="text-muted-foreground group-hover:text-foreground transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>

            {/* Collapsible Content */}
            <AnimatePresence initial={false}>
              {!isCompletedCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ 
                    duration: 0.3, 
                    ease: "easeInOut",
                    opacity: { duration: 0.2 }
                  }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="space-y-2 pt-2">
                    {filteredCompletedTasks.map((task) => (
                      <CompletedTaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      {/* 一括操作ツールバー（選択されたタスクがある場合のみ表示） */}
      <AnimatePresence>
        {isSelectionMode && selectedTaskIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
          >
            <Card className="p-4 shadow-lg border-2">
              <div className="flex items-center gap-4">
                {/* 選択数 */}
                <span className="text-sm font-medium">
                  {selectedTaskIds.size}個選択中
                </span>
                
                <Separator orientation="vertical" className="h-6" />
                
                {/* アクションボタン */}
                <div className="flex items-center gap-2">
                  {/* すべて選択 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allTaskIds = new Set(filteredTasks.map(t => t.id))
                      setSelectedTaskIds(allTaskIds)
                    }}
                  >
                    すべて選択
                  </Button>
                  
                  {/* 選択解除 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTaskIds(new Set())}
                  >
                    選択解除
                  </Button>
                  
                  <Separator orientation="vertical" className="h-6" />
                  
                  {/* 完了ボタン */}
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      if (confirm(`${selectedTaskIds.size}個のタスクを完了しますか？`)) {
                        const taskIdsArray = Array.from(selectedTaskIds)
                        for (const taskId of taskIdsArray) {
                          await completeTask(taskId)
                        }
                        setSelectedTaskIds(new Set())
                        setIsSelectionMode(false)
                      }
                    }}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    完了
                  </Button>
                  
                  {/* 削除ボタン */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (confirm(`${selectedTaskIds.size}個のタスクを削除しますか？\nこの操作は取り消せません。`)) {
                        const taskIdsArray = Array.from(selectedTaskIds)
                        for (const taskId of taskIdsArray) {
                          await deleteTask(taskId)
                        }
                        setSelectedTaskIds(new Set())
                        setIsSelectionMode(false)
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    削除
                  </Button>
                  
                  {/* キャンセル */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsSelectionMode(false)
                      setSelectedTaskIds(new Set())
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}