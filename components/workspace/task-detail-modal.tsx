'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Task, Priority, Urgency, TaskCategory } from '@/lib/types'
import { useCategoryStoreWithAuth } from '@/lib/hooks/use-category-store-with-auth'
import { Edit2, Save, X, Clock, AlertCircle } from 'lucide-react'

interface TaskDetailModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onSave: (taskId: string, updates: Partial<Task>) => void
}

export function TaskDetailModal({ task, isOpen, onClose, onSave }: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<Task>>({})
  const { allCategories } = useCategoryStoreWithAuth()

  if (!task) return null

  const handleEdit = () => {
    setFormData({
      title: task.title,
      priority: task.priority,
      urgency: task.urgency,
      category: task.category,
      estimatedTime: task.estimatedTime,
      notes: task.notes || ''
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({})
  }

  const handleSave = () => {
    onSave(task.id, formData)
    setIsEditing(false)
    setFormData({})
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}分`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`
  }

  const categoryInfo = allCategories.find(c => c.id === task.category)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              ) : (
                task.title
              )}
            </DialogTitle>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  編集
                </Button>
              ) : (
                <>
                  <Button variant="default" size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-1" />
                    保存
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* メタデータ */}
          <div className="flex flex-wrap gap-2">
            {isEditing ? (
              <>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                  className="px-3 py-1 border border-border rounded text-sm bg-background"
                >
                  <option value="high">優先度：高</option>
                  <option value="low">優先度：低</option>
                </select>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value as Urgency }))}
                  className="px-3 py-1 border border-border rounded text-sm bg-background"
                >
                  <option value="high">緊急度：高</option>
                  <option value="low">緊急度：低</option>
                </select>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as TaskCategory }))}
                  className="px-3 py-1 border border-border rounded text-sm bg-background"
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
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) || 30 }))}
                  className="px-3 py-1 border border-border rounded text-sm bg-background w-24"
                  placeholder="分"
                />
              </>
            ) : (
              <>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  task.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  優先度：{task.priority === 'high' ? '高' : '低'}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  task.urgency === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  緊急度：{task.urgency === 'high' ? '高' : '低'}
                </div>
                {categoryInfo && (
                  <div className="px-3 py-1 rounded-full text-sm font-medium bg-muted">
                    {categoryInfo.icon} {categoryInfo.name}
                  </div>
                )}
                <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-muted">
                  <Clock className="w-4 h-4" />
                  {formatTime(task.estimatedTime)}
                </div>
              </>
            )}
          </div>

          {/* メモ欄 */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">メモ</h3>
            {isEditing ? (
              <RichTextEditor
                value={formData.notes as string}
                onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
                placeholder="タスクに関するメモを入力..."
              />
            ) : (
              task.notes ? (
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-lg bg-muted/20"
                  dangerouslySetInnerHTML={{ __html: task.notes }}
                />
              ) : (
                <p className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg">
                  メモはまだありません
                </p>
              )
            )}
          </div>

          {/* 作成日時・更新日時 */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>作成日時: {task.createdAt.toLocaleString('ja-JP')}</p>
            <p>更新日時: {task.updatedAt.toLocaleString('ja-JP')}</p>
            {task.completedAt && (
              <p>完了日時: {task.completedAt.toLocaleString('ja-JP')}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}