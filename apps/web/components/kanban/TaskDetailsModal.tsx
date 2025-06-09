'use client'

import { useState, useEffect } from 'react'
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar,
  Clock, 
  User, 
  Edit3, 
  Save, 
  X, 
  Trash2,
  AlertTriangle,
  Zap,
  MapPin,
  Tag,
  MessageSquare,
  Paperclip,
  MoreHorizontal,
  Loader2
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { formatTaskDuration, getTaskPriorityColor, getTaskStatusColor } from '@/lib/tasks'
import { formatDateTime } from '@/lib/utils'
import type { Task, UpdateTaskInput, TaskPriority, EnergyLevel, TaskStatus, TaskContext } from '@/types/tasks'

interface TaskDetailsModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
}

export function TaskDetailsModal({ task, isOpen, onClose }: TaskDetailsModalProps) {
  const { user } = useAuth()
  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()

  const [isEditing, setIsEditing] = useState(false)
  const [editedTask, setEditedTask] = useState<Partial<UpdateTaskInput>>({})

  // Initialize edited task when task changes
  useEffect(() => {
    if (task) {
      setEditedTask({
        title: task.title,
        description: task.description,
        priority: task.priority,
        energy_level: task.energy_level,
        context: task.context,
        estimated_duration: task.estimated_duration,
        start_time: task.start_time,
        end_time: task.end_time,
        status: task.status
      })
    }
  }, [task])

  const handleSave = async () => {
    if (!editedTask.title?.trim()) return

    const result = await updateTaskMutation.mutateAsync({
      taskId: task.id,
      input: editedTask
    })

    if (result.data) {
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    if (window.confirm('このタスクを削除してもよろしいですか？')) {
      const result = await deleteTaskMutation.mutateAsync(task.id)
      if (!result.error) {
        onClose()
      }
    }
  }

  const handleCancel = () => {
    setEditedTask({
      title: task.title,
      description: task.description,
      priority: task.priority,
      energy_level: task.energy_level,
      context: task.context,
      estimated_duration: task.estimated_duration,
      start_time: task.start_time,
      end_time: task.end_time,
      status: task.status
    })
    setIsEditing(false)
  }

  const canEdit = user?.id === task.created_by_id || user?.id === task.assignee_id

  const getStatusDisplay = (status: TaskStatus) => {
    const statusMap = {
      todo: '未着手',
      in_progress: '進行中',
      review: 'レビュー',
      completed: '完了',
      cancelled: 'キャンセル'
    }
    return statusMap[status] || status
  }

  const getPriorityDisplay = (priority: TaskPriority) => {
    const priorityMap = {
      urgent: '緊急',
      high: '高',
      medium: '中',
      low: '低'
    }
    return priorityMap[priority] || priority
  }

  const getEnergyDisplay = (energy: EnergyLevel) => {
    const energyMap = {
      high: '高',
      medium: '中',
      low: '低'
    }
    return energyMap[energy] || energy
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editedTask.title || ''}
                  onChange={(e) => setEditedTask(prev => ({ ...prev, title: e.target.value }))}
                  className="text-lg font-semibold"
                  placeholder="タスク名を入力..."
                />
              ) : (
                <DialogTitle className="text-xl">{task.title}</DialogTitle>
              )}
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-1" />
                    キャンセル
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSave}
                    disabled={updateTaskMutation.isPending}
                  >
                    {updateTaskMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    保存
                  </Button>
                </>
              ) : (
                canEdit && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit3 className="h-4 w-4 mr-1" />
                      編集
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                          <Edit3 className="mr-2 h-4 w-4" />
                          編集
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={handleDelete}
                          className="text-red-600"
                          disabled={deleteTaskMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )
              )}
            </div>
          </div>
          
          <DialogDescription>
            プロジェクト: {task.project?.name || 'Unknown Project'}
          </DialogDescription>
        </DialogHeader>

        {(updateTaskMutation.error || deleteTaskMutation.error) && (
          <Alert variant="destructive">
            <AlertDescription>
              {(updateTaskMutation.error instanceof Error ? updateTaskMutation.error.message : String(updateTaskMutation.error)) || 
               (deleteTaskMutation.error instanceof Error ? deleteTaskMutation.error.message : String(deleteTaskMutation.error)) || 
               'エラーが発生しました'}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Status and Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">ステータス</Label>
              {isEditing ? (
                <Select
                  value={editedTask.status}
                  onValueChange={(value: TaskStatus) => 
                    setEditedTask(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">未着手</SelectItem>
                    <SelectItem value="in_progress">進行中</SelectItem>
                    <SelectItem value="review">レビュー</SelectItem>
                    <SelectItem value="completed">完了</SelectItem>
                    <SelectItem value="cancelled">キャンセル</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={getTaskStatusColor(task.status)}>
                  {getStatusDisplay(task.status)}
                </Badge>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">優先度</Label>
              {isEditing ? (
                <Select
                  value={editedTask.priority}
                  onValueChange={(value: TaskPriority) => 
                    setEditedTask(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">🔴 緊急</SelectItem>
                    <SelectItem value="high">🟡 高</SelectItem>
                    <SelectItem value="medium">🟢 中</SelectItem>
                    <SelectItem value="low">⚪ 低</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={getTaskPriorityColor(task.priority)}>
                  {getPriorityDisplay(task.priority)}
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium mb-2 block">説明</Label>
            {isEditing ? (
              <Textarea
                value={editedTask.description || ''}
                onChange={(e) => setEditedTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="タスクの詳細を入力..."
                rows={4}
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md min-h-[80px]">
                {task.description ? (
                  <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
                ) : (
                  <p className="text-gray-500 italic">説明はありません</p>
                )}
              </div>
            )}
          </div>

          {/* Energy Level and Context */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">エネルギーレベル</Label>
              {isEditing ? (
                <Select
                  value={editedTask.energy_level || ''}
                  onValueChange={(value: EnergyLevel) => 
                    setEditedTask(prev => ({ ...prev, energy_level: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">⚡ 高</SelectItem>
                    <SelectItem value="medium">🔋 中</SelectItem>
                    <SelectItem value="low">🪫 低</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-gray-500" />
                  <span>{task.energy_level ? getEnergyDisplay(task.energy_level) : '-'}</span>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">実行場所</Label>
              {isEditing ? (
                <Select
                  value={editedTask.context || ''}
                  onValueChange={(value: TaskContext) => 
                    setEditedTask(prev => ({ ...prev, context: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anywhere">🌍 どこでも</SelectItem>
                    <SelectItem value="pc_required">💻 PC必須</SelectItem>
                    <SelectItem value="home_only">🏠 自宅のみ</SelectItem>
                    <SelectItem value="office_only">🏢 オフィスのみ</SelectItem>
                    <SelectItem value="phone_only">📱 スマホのみ</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{task.context || '-'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Time Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">予定時間</Label>
              {isEditing ? (
                <Input
                  type="number"
                  placeholder="分"
                  value={editedTask.estimated_duration || ''}
                  onChange={(e) => setEditedTask(prev => ({ 
                    ...prev, 
                    estimated_duration: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{formatTaskDuration(task.estimated_duration)}</span>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">実際の時間</Label>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{formatTaskDuration(task.actual_duration)}</span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">開始日時</Label>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{task.start_time ? formatDateTime(task.start_time) : '-'}</span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">終了日時</Label>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{task.end_time ? formatDateTime(task.end_time) : '-'}</span>
              </div>
            </div>
          </div>

          {/* Assignee and Creator */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">担当者</Label>
              {task.assignee ? (
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee?.avatar_url} alt={task.assignee?.display_name} />
                    <AvatarFallback>
                      {task.assignee?.display_name?.charAt(0) || task.assignee?.email?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{task.assignee?.display_name || task.assignee?.email || 'Unknown'}</span>
                </div>
              ) : (
                <span className="text-gray-500">未割り当て</span>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">作成者</Label>
              {task.created_by ? (
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.created_by?.avatar_url} alt={task.created_by?.display_name} />
                    <AvatarFallback>
                      {task.created_by?.display_name?.charAt(0) || task.created_by?.email?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{task.created_by?.display_name || task.created_by?.email || 'Unknown'}</span>
                </div>
              ) : (
                <span className="text-gray-500">-</span>
              )}
            </div>
          </div>

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">ラベル</Label>
              <div className="flex flex-wrap gap-2">
                {task.labels.map((label) => (
                  <Badge key={label} variant="secondary">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <Label className="text-sm font-medium mb-1 block">作成日時</Label>
              <span>{formatDateTime(task.created_at)}</span>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">更新日時</Label>
              <span>{formatDateTime(task.updated_at)}</span>
            </div>
          </div>

          {task.completed_at && (
            <div className="text-sm text-gray-600">
              <Label className="text-sm font-medium mb-1 block">完了日時</Label>
              <span>{formatDateTime(task.completed_at)}</span>
            </div>
          )}

          {/* AI Generated Indicator */}
          {task.ai_generated && (
            <div className="flex items-center space-x-2 p-3 bg-tasktime-50 rounded-lg">
              <div className="w-2 h-2 bg-tasktime-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-tasktime-700">このタスクはAIによって生成されました</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TaskDetailsModal