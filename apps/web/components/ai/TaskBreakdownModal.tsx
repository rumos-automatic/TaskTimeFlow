'use client'

import { useState, useEffect } from 'react'
import { useAIAssistant } from '@/hooks/useAI'
import { useCreateTask } from '@/hooks/useTasks'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Lightbulb,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTaskDuration, getTaskPriorityColor } from '@/lib/tasks'
import type { Task } from '@/types/tasks'
import type { TaskBreakdownResponse, SubtaskSuggestion } from '@/types/ai'

interface TaskBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task
}

export function TaskBreakdownModal({ isOpen, onClose, task }: TaskBreakdownModalProps) {
  const [breakdown, setBreakdown] = useState<TaskBreakdownResponse | null>(null)
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<number>>(new Set())
  const [isCreatingTasks, setIsCreatingTasks] = useState(false)
  
  const { performTaskBreakdown, isProcessing, currentOperation } = useAIAssistant()
  const createTaskMutation = useCreateTask()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setBreakdown(null)
      setSelectedSubtasks(new Set())
      setIsCreatingTasks(false)
    }
  }, [isOpen])

  // Auto-select all subtasks when breakdown is received
  useEffect(() => {
    if (breakdown) {
      setSelectedSubtasks(new Set(breakdown.subtasks.map((_, index) => index)))
    }
  }, [breakdown])

  const handleBreakdown = async () => {
    try {
      const result = await performTaskBreakdown(task, {
        target_subtask_count: 5,
        max_subtask_duration: 60,
        preserve_constraints: true,
        include_dependencies: true
      })
      setBreakdown(result)
    } catch (error) {
      console.error('Task breakdown failed:', error)
    }
  }

  const handleSubtaskToggle = (index: number) => {
    const newSelected = new Set(selectedSubtasks)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedSubtasks(newSelected)
  }

  const handleCreateTasks = async () => {
    if (!breakdown || selectedSubtasks.size === 0) return

    setIsCreatingTasks(true)
    try {
      const selectedSuggestions = breakdown.subtasks.filter((_, index) => 
        selectedSubtasks.has(index)
      )

      // Create tasks in sequence to maintain order
      for (let i = 0; i < selectedSuggestions.length; i++) {
        const subtask = selectedSuggestions[i]
        const taskData = {
          title: subtask.title,
          description: subtask.description,
          estimated_duration: subtask.estimated_duration,
          priority: subtask.priority,
          energy_level: subtask.energy_level,
          context: subtask.context,
          labels: subtask.labels || [],
          parent_task_id: task.id,
          order: subtask.order,
          status: 'todo' as const
        }

        await createTaskMutation.mutateAsync(taskData)
      }

      onClose()
    } catch (error) {
      console.error('Failed to create subtasks:', error)
    } finally {
      setIsCreatingTasks(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50'
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getEnergyIcon = (level?: string) => {
    return <Zap className={cn(
      'h-3 w-3',
      level === 'high' ? 'text-red-500' :
      level === 'medium' ? 'text-yellow-500' : 'text-green-500'
    )} />
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-blue-500" />
            <span>AIタスク分解</span>
          </DialogTitle>
          <DialogDescription>
            AIがタスクを効率的なサブタスクに分解します
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Original Task Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">元タスク</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <h3 className="font-medium">{task.title}</h3>
                {task.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                )}
                <div className="flex items-center space-x-2">
                  <Badge className={getTaskPriorityColor(task.priority)}>
                    {task.priority === 'urgent' ? '緊急' :
                     task.priority === 'high' ? '高' :
                     task.priority === 'medium' ? '中' : '低'}
                  </Badge>
                  {task.estimated_duration && (
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTaskDuration(task.estimated_duration)}
                    </Badge>
                  )}
                  {task.energy_level && (
                    <Badge variant="outline">
                      {getEnergyIcon(task.energy_level)}
                      <span className="ml-1">
                        {task.energy_level === 'high' ? '高' :
                         task.energy_level === 'medium' ? '中' : '低'}エネルギー
                      </span>
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown Results or Generate Button */}
          {!breakdown && !isProcessing && (
            <div className="text-center py-8">
              <div className="space-y-4">
                <div className="text-gray-500">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                  <p>AIがこのタスクを効率的なサブタスクに分解します</p>
                </div>
                <Button onClick={handleBreakdown} size="lg">
                  <Lightbulb className="mr-2 h-4 w-4" />
                  タスクを分解する
                </Button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="text-center py-8">
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-500" />
                <div>
                  <p className="font-medium">{currentOperation}</p>
                  <p className="text-sm text-gray-500">AIが最適な分解を計算しています...</p>
                </div>
                <Progress value={85} className="max-w-sm mx-auto" />
              </div>
            </div>
          )}

          {/* Breakdown Results */}
          {breakdown && (
            <div className="space-y-4">
              {/* Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>分解結果</span>
                    <Badge className={getConfidenceColor(breakdown.confidence)}>
                      信頼度 {breakdown.confidence}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">{breakdown.reasoning}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">サブタスク数:</span>
                        <span className="ml-2 font-medium">{breakdown.subtasks.length}個</span>
                      </div>
                      <div>
                        <span className="text-gray-500">推定合計時間:</span>
                        <span className="ml-2 font-medium">
                          {formatTaskDuration(breakdown.estimated_total_time)}
                        </span>
                      </div>
                    </div>

                    {breakdown.warnings && breakdown.warnings.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            {breakdown.warnings.map((warning, index) => (
                              <p key={index} className="text-sm">{warning}</p>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Subtasks List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>サブタスク ({breakdown.subtasks.length})</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedSubtasks.size === breakdown.subtasks.length) {
                          setSelectedSubtasks(new Set())
                        } else {
                          setSelectedSubtasks(new Set(breakdown.subtasks.map((_, i) => i)))
                        }
                      }}
                    >
                      {selectedSubtasks.size === breakdown.subtasks.length ? '全て解除' : '全て選択'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {breakdown.subtasks.map((subtask, index) => (
                      <div
                        key={index}
                        className={cn(
                          'p-3 border rounded-lg transition-colors',
                          selectedSubtasks.has(index) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                        )}
                      >
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={selectedSubtasks.has(index)}
                            onCheckedChange={() => handleSubtaskToggle(index)}
                            className="mt-0.5"
                          />
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-sm">{subtask.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                #{subtask.order}
                              </Badge>
                            </div>
                            
                            {subtask.description && (
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {subtask.description}
                              </p>
                            )}

                            <div className="flex items-center flex-wrap gap-2">
                              <Badge className={getTaskPriorityColor(subtask.priority)} className="text-xs">
                                {subtask.priority === 'urgent' ? '緊急' :
                                 subtask.priority === 'high' ? '高' :
                                 subtask.priority === 'medium' ? '中' : '低'}
                              </Badge>
                              
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTaskDuration(subtask.estimated_duration)}
                              </Badge>

                              {subtask.energy_level && (
                                <Badge variant="outline" className="text-xs">
                                  {getEnergyIcon(subtask.energy_level)}
                                  <span className="ml-1">
                                    {subtask.energy_level === 'high' ? '高' :
                                     subtask.energy_level === 'medium' ? '中' : '低'}
                                  </span>
                                </Badge>
                              )}

                              {subtask.context && (
                                <Badge variant="outline" className="text-xs">
                                  {subtask.context === 'pc_required' ? 'PC必須' :
                                   subtask.context === 'home_only' ? '自宅のみ' :
                                   subtask.context === 'office_only' ? 'オフィスのみ' :
                                   subtask.context === 'phone_only' ? '電話のみ' : 'どこでも'}
                                </Badge>
                              )}
                            </div>

                            {subtask.dependencies && subtask.dependencies.length > 0 && (
                              <div className="text-xs text-gray-500">
                                <span className="font-medium">依存関係:</span>
                                <span className="ml-1">{subtask.dependencies.join(', ')}</span>
                              </div>
                            )}

                            {subtask.labels && subtask.labels.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {subtask.labels.map((label, labelIndex) => (
                                  <Badge key={labelIndex} variant="secondary" className="text-xs">
                                    {label}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          
          {breakdown && (
            <Button
              onClick={handleCreateTasks}
              disabled={selectedSubtasks.size === 0 || isCreatingTasks}
            >
              {isCreatingTasks ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  作成中...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  選択したタスクを作成 ({selectedSubtasks.size})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TaskBreakdownModal