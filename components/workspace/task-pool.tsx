'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Plus, Circle, Clock, AlertCircle, X, Edit2, Trash2, MoreVertical, Check } from 'lucide-react'
import { useTaskStore } from '@/lib/store/use-task-store'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Task, Priority, TaskCategory } from '@/lib/types'
import { useViewState } from '@/lib/hooks/use-view-state'

const priorityColors: Record<Priority, string> = {
  high: 'border-red-500 bg-red-50 dark:bg-red-950/20',
  medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
  low: 'border-green-500 bg-green-50 dark:bg-green-950/20'
}

interface DraggableTaskCardProps {
  task: Task
}

function DraggableTaskCard({ task }: DraggableTaskCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const { updateTask, deleteTask, completeTask } = useTaskStore()
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
        }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex items-start justify-between relative">
          {/* ドラッグ可能エリア */}
          <div 
            {...listeners}
            className="flex-1 cursor-move touch-none"
            style={{ touchAction: 'none' }}
          >
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
    </div>
  )
}

interface CompletedTaskCardProps {
  task: Task
}

function CompletedTaskCard({ task }: CompletedTaskCardProps) {
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

  return (
    <Card className="p-3 border-border bg-muted/30 opacity-75">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <Check className="w-4 h-4 text-green-600" />
            <h4 className="font-medium text-sm line-through text-muted-foreground">{task.title}</h4>
          </div>
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{formatTime(task.estimatedTime)}</span>
            </div>
            {task.completedAt && (
              <span>完了: {formatDate(task.completedAt)}</span>
            )}
          </div>
        </div>
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
  const [formData, setFormData] = useState({
    title: task.title,
    priority: task.priority,
    category: task.category,
    estimatedTime: task.estimatedTime as number | ''
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

        <div className="grid grid-cols-3 gap-2">
          <select
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
            className="px-2 py-1 border border-border rounded text-xs bg-background"
          >
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>

          <select
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as TaskCategory }))}
            className="px-2 py-1 border border-border rounded text-xs bg-background"
          >
            <option value="work">仕事</option>
            <option value="personal">個人</option>
            <option value="custom">カスタム</option>
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

function AddTaskForm() {
  const { addTask } = useTaskStore()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    priority: 'medium' as Priority,
    category: 'work' as TaskCategory,
    estimatedTime: 30 as number | ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    addTask({
      title: formData.title,
      priority: formData.priority,
      category: formData.category,
      estimatedTime: formData.estimatedTime === '' ? 30 : formData.estimatedTime,
      status: 'todo'
    })

    // Reset form
    setFormData({
      title: '',
      priority: 'medium',
      category: 'work',
      estimatedTime: 30
    })
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

          <div className="grid grid-cols-3 gap-2">
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
              className="px-2 py-1 border border-border rounded text-xs bg-background"
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>

            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as TaskCategory }))}
              className="px-2 py-1 border border-border rounded text-xs bg-background"
            >
              <option value="work">仕事</option>
              <option value="personal">個人</option>
              <option value="custom">カスタム</option>
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
    <Button className="w-full" variant="outline" onClick={() => setShowForm(true)}>
      <Plus className="w-4 h-4 mr-2" />
      新しいタスクを追加
    </Button>
  )
}

export function TaskPool() {
  const { 
    tasks, 
    selectedCategory, 
    setSelectedCategory, 
    getTasksByCategory,
    getUnscheduledTasks,
    getCompletedTasks
  } = useTaskStore()

  const { setNodeRef, isOver } = useDroppable({
    id: 'task-pool'
  })

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
      className={`space-y-4 h-full flex flex-col transition-colors ${
        isOver ? 'bg-muted/20' : ''
      }`}
    >
      {/* Category Tabs */}
      <div className="flex space-x-2">
        <Button 
          variant={selectedCategory === 'work' ? 'default' : 'outline'}
          size="sm" 
          className="flex-1"
          onClick={() => setSelectedCategory('work')}
        >
          仕事
        </Button>
        <Button 
          variant={selectedCategory === 'personal' ? 'default' : 'outline'}
          size="sm" 
          className="flex-1"
          onClick={() => setSelectedCategory('personal')}
        >
          個人
        </Button>
        <Button 
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm" 
          className="flex-1"
          onClick={() => setSelectedCategory('all')}
        >
          すべて
        </Button>
      </div>

      <Separator />

      {/* Add Task Form */}
      <AddTaskForm />

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {filteredTasks.map((task) => (
          <DraggableTaskCard 
            key={task.id} 
            task={task} 
          />
        ))}
        {filteredTasks.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            タスクがありません
          </div>
        )}

        {/* Completed Tasks Section */}
        {filteredCompletedTasks.length > 0 && (
          <div className="pt-4">
            <Separator />
            <div className="flex items-center space-x-2 py-3">
              <Check className="w-4 h-4 text-green-600" />
              <h3 className="text-sm font-medium text-muted-foreground">
                完了済み ({filteredCompletedTasks.length})
              </h3>
            </div>
            <div className="space-y-2">
              {filteredCompletedTasks.map((task) => (
                <CompletedTaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sync Status */}
      <div className="text-xs text-muted-foreground text-center">
        最終同期: ローカル保存
      </div>
    </div>
  )
}