'use client'

import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Plus, Circle, Clock, AlertCircle, X, Edit2, Trash2, MoreVertical, Check, RotateCcw, ChevronDown, ChevronUp, Settings, ChevronLeft, ChevronRight, Copy, FileText } from 'lucide-react'
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
}

function DraggableTaskCard({ task }: DraggableTaskCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const { updateTask, deleteTask, completeTask, addTask } = useTaskStoreWithAuth()
  const { user } = useAuth()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id })

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
        } ${urgencyColors[task.urgency]}`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div 
          {...listeners}
          {...attributes}
          className="flex items-start justify-between relative cursor-move w-full"
        >
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
            </div>
          </div>
          
          {/* アクションボタン */}
          {showActions && (
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
}

interface CompletedTaskCardProps {
  task: Task
}

function CompletedTaskCard({ task }: CompletedTaskCardProps) {
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
}

interface EditTaskCardProps {
  task: Task
  onSave: (task: Partial<Task>) => void
  onCancel: () => void
}

function EditTaskCard({ task, onSave, onCancel }: EditTaskCardProps) {
  const { allCategories } = useCategoryStoreWithAuth()
  const [formData, setFormData] = useState({
    title: task.title,
    priority: task.priority,
    urgency: task.urgency,
    category: task.category,
    estimatedTime: task.estimatedTime as number | '',
    notes: task.notes || ''
  })


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    // 空文字列の場合はデフォルト値を設定
    const finalData = {
      ...formData,
      estimatedTime: formData.estimatedTime === '' ? 30 : formData.estimatedTime
    }
    onSave(finalData)
  }

  return (
    <Card className="p-4 border-primary">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
          required
        />

        {/* 優先度と緊急度の設定（編集） */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border rounded p-2 bg-background">
              <label className="text-xs font-medium text-foreground mb-1 block flex items-center">
                <AlertCircle className="w-3 h-3 mr-1 text-red-500" />
                優先度
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                className="w-full px-2 py-1 border border-border rounded text-xs bg-background focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="high">高 - 重要</option>
                <option value="low">低 - 軽微</option>
              </select>
            </div>

            <div className="border border-border rounded p-2 bg-background">
              <label className="text-xs font-medium text-foreground mb-1 block flex items-center">
                <Clock className="w-3 h-3 mr-1 text-purple-600" />
                緊急度
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value as Urgency }))}
                className="w-full px-2 py-1 border border-border rounded text-xs bg-background focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="high">高 - 早急</option>
                <option value="low">低 - 余裕</option>
              </select>
            </div>
          </div>
          
          {/* プレビュー（編集） */}
          <div className="flex items-center justify-center space-x-1 py-1 bg-muted/20 rounded">
            <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              formData.priority === 'high' ? 'bg-red-100 text-red-700' :
              'bg-green-100 text-green-700'
            }`}>
              優先度：{formData.priority === 'high' ? '高' : '低'}
            </div>
            <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              formData.urgency === 'high' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              緊急度：{formData.urgency === 'high' ? '高' : '低'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as TaskCategory }))}
            className="px-2 py-1 border border-border rounded text-xs bg-background"
          >
            {allCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="5"
            max="480"
            value={formData.estimatedTime}
            onChange={(e) => {
              const value = e.target.value
              setFormData(prev => ({ 
                ...prev, 
                estimatedTime: value === '' ? '' : (parseInt(value) || 30)
              }))
            }}
            className="px-2 py-1 border border-border rounded text-xs bg-background"
            placeholder="分"
          />
        </div>

        {/* メモ欄 */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground block">
            メモ
          </label>
          <RichTextEditor
            value={formData.notes}
            onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
            placeholder="タスクに関するメモを入力..."
            className="text-sm"
          />
        </div>

        <div className="flex space-x-2">
          <Button type="submit" size="sm" className="flex-1">
            保存
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={onCancel}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </Card>
  )
}

interface AddTaskFormProps {
  defaultCategory?: CategoryFilter
}

function AddTaskForm({ defaultCategory }: AddTaskFormProps) {
  const { user } = useAuth()
  const { addTask } = useTaskStoreWithAuth()
  const { allCategories } = useCategoryStoreWithAuth()
  const [showForm, setShowForm] = useState(false)
  
  // フォームを開く時に現在のカテゴリを設定
  const initializeFormData = () => {
    const category = defaultCategory && defaultCategory !== 'all' ? defaultCategory : 'work'
    return {
      title: '',
      priority: 'low' as Priority,
      urgency: 'low' as Urgency,
      category: category as TaskCategory,
      estimatedTime: 30 as number | ''
    }
  }
  
  const [formData, setFormData] = useState(initializeFormData())


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !user) return

    const taskData = {
      title: formData.title,
      priority: formData.priority,
      urgency: formData.urgency,
      category: formData.category,
      estimatedTime: formData.estimatedTime === '' ? 30 : formData.estimatedTime,
      status: 'todo' as const
    }

    await addTask(taskData, user.id)

    // Reset form with current category
    setFormData(initializeFormData())
    setShowForm(false)
  }

  if (showForm) {
    return (
      <Card className="p-4 border-dashed border-primary">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="タスク名を入力..."
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              required
            />
          </div>

          {/* 優先度と緊急度の設定 */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-border rounded-lg p-3 bg-background">
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                  優先度
                </label>
                <p className="text-xs text-muted-foreground mb-2">重要度・価値の高さ</p>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                  className="w-full px-3 py-2 border border-border rounded text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="high">高 - 非常に重要</option>
                  <option value="low">低 - あまり重要でない</option>
                </select>
              </div>

              <div className="border border-border rounded-lg p-3 bg-background">
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-purple-600" />
                  緊急度
                </label>
                <p className="text-xs text-muted-foreground mb-2">時間的な切迫性</p>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value as Urgency }))}
                  className="w-full px-3 py-2 border border-border rounded text-sm bg-background focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="high">高 - 早めに対応</option>
                  <option value="low">低 - 時間に余裕あり</option>
                </select>
              </div>
            </div>
            
            {/* プレビュー */}
            <div className="flex items-center justify-center space-x-2 py-2 bg-muted/30 rounded-lg">
              <span className="text-xs text-muted-foreground">プレビュー:</span>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                formData.priority === 'high' ? 'bg-red-100 text-red-700' :
                'bg-green-100 text-green-700'
              }`}>
                優先度：{formData.priority === 'high' ? '高' : '低'}
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                formData.urgency === 'high' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                緊急度：{formData.urgency === 'high' ? '高' : '低'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as TaskCategory }))}
              className="px-2 py-1 border border-border rounded text-xs bg-background"
            >
              {allCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="5"
              max="480"
              value={formData.estimatedTime}
              onChange={(e) => {
                const value = e.target.value
                setFormData(prev => ({ 
                  ...prev, 
                  estimatedTime: value === '' ? '' : (parseInt(value) || 30)
                }))
              }}
              className="px-2 py-1 border border-border rounded text-xs bg-background"
              placeholder="分"
            />
          </div>

          <div className="flex space-x-2">
            <Button type="submit" size="sm" className="flex-1">
              追加
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => setShowForm(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Card>
    )
  }

  return (
    <Button 
      className="w-full" 
      variant="outline" 
      onClick={() => {
        // フォームを開く前にカテゴリを再設定
        setFormData(initializeFormData())
        setShowForm(true)
      }}
    >
      <Plus className="w-4 h-4 mr-2" />
      新しいタスクを追加
    </Button>
  )
}

export function TaskPool() {
  const { 
    tasks, 
    getTasksByCategory,
    getUnscheduledTasks,
    getCompletedTasks,
    removeDuplicateTasks,
    resetMigrationStatus,
    hideCompletedTask,
    clearHiddenCompletedTasks
  } = useTaskStoreWithAuth()
  
  const { 
    allCategories, 
    selectedCategory, 
    setSelectedCategory,
    googleTasksSync 
  } = useCategoryStoreWithAuth()
  
  
  const [showDebugMenu, setShowDebugMenu] = useState(false)


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

  const unscheduledTasks = getUnscheduledTasks()
  const completedTasks = getCompletedTasks()
  const filteredTasks = selectedCategory === 'all' 
    ? unscheduledTasks 
    : unscheduledTasks.filter(task => task.category === selectedCategory)
  const filteredCompletedTasks = selectedCategory === 'all'
    ? completedTasks
    : completedTasks.filter(task => task.category === selectedCategory)

  return (
    <div 
      ref={setNodeRef}
      className={`space-y-3 h-full flex flex-col transition-colors pb-0 ${
        isOver ? 'bg-muted/20' : ''
      }`}
    >
      {/* Dynamic Category Tabs */}
      <div className="space-y-2">
        {/* Main tab row with scroll */}
        <div className="flex items-center space-x-2">
          <div className="flex-1 overflow-hidden">
            <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-1">
              {/* All tab */}
              <Button 
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm" 
                className="flex-shrink-0"
                onClick={() => setSelectedCategory('all')}
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
                    onClick={() => setSelectedCategory(category.id)}
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

      {/* Add Task Form */}
      <AddTaskForm defaultCategory={selectedCategory} />

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-0">
        <SortableContext items={filteredTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {filteredTasks.map((task) => (
            <DraggableTaskCard 
              key={task.id} 
              task={task} 
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
    </div>
  )
}