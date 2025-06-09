'use client'

import { useState, useRef, useEffect } from 'react'
import { useAIAssistant } from '@/hooks/useAI'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bot,
  Send,
  Lightbulb,
  Clock,
  Target,
  Sparkles,
  Loader2,
  MessageSquare,
  X,
  Settings,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTaskDuration } from '@/lib/tasks'
import type { Task } from '@/types/tasks'
import TaskBreakdownModal from './TaskBreakdownModal'
import ScheduleOptimizer from './ScheduleOptimizer'
import AISettingsModal from './AISettingsModal'

interface AIAssistantPopupProps {
  tasks: Task[]
  selectedDate?: Date
  className?: string
  onScheduleApply?: (schedule: any) => void
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: any
}

export function AIAssistantPopup({ 
  tasks, 
  selectedDate = new Date(), 
  className,
  onScheduleApply 
}: AIAssistantPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeFunction, setActiveFunction] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [showBreakdownModal, setShowBreakdownModal] = useState(false)
  const [showOptimizerModal, setShowOptimizerModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  
  const { 
    isProcessing, 
    currentOperation, 
    canUseAI,
    performTaskBreakdown,
    performTimeEstimation,
    performScheduleOptimization,
    getSuggestions
  } = useAIAssistant()
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && chatMessages.length === 0) {
      addMessage('assistant', `こんにちは！TaskTimeFlow AIアシスタントです。${tasks.length}個のタスクについてお手伝いできます。`, {
        suggestions: [
          'タスクを分解する',
          '時間を見積もる', 
          'スケジュールを最適化する',
          '改善提案を取得する'
        ]
      })
    }
  }, [isOpen, tasks.length])

  const addMessage = (type: 'user' | 'assistant', content: string, metadata?: any) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      metadata
    }
    setChatMessages(prev => [...prev, message])
  }

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isProcessing) return

    const userMessage = currentMessage.trim()
    setCurrentMessage('')
    addMessage('user', userMessage)

    // Simple intent detection (in a real app, this would be more sophisticated)
    if (userMessage.includes('分解') || userMessage.includes('breakdown')) {
      if (tasks.length === 1) {
        setSelectedTask(tasks[0])
        setShowBreakdownModal(true)
        addMessage('assistant', 'タスク分解モーダルを開きました。')
      } else {
        addMessage('assistant', 'どのタスクを分解しますか？', {
          taskSelection: true,
          action: 'breakdown'
        })
      }
    } else if (userMessage.includes('時間') || userMessage.includes('見積')) {
      if (tasks.length === 1) {
        handleTimeEstimation(tasks[0])
      } else {
        addMessage('assistant', 'どのタスクの時間を見積もりますか？', {
          taskSelection: true,
          action: 'estimate'
        })
      }
    } else if (userMessage.includes('最適化') || userMessage.includes('スケジュール')) {
      setShowOptimizerModal(true)
      addMessage('assistant', 'スケジュール最適化モーダルを開きました。')
    } else if (userMessage.includes('提案') || userMessage.includes('改善')) {
      handleGetSuggestions()
    } else {
      addMessage('assistant', 'ご質問の内容を理解できませんでした。以下から選択してください：', {
        suggestions: [
          'タスクを分解する',
          '時間を見積もる',
          'スケジュールを最適化する',
          '改善提案を取得する'
        ]
      })
    }
  }

  const handleTaskSelection = (task: Task, action: string) => {
    setSelectedTask(task)
    
    switch (action) {
      case 'breakdown':
        setShowBreakdownModal(true)
        addMessage('assistant', `「${task.title}」のタスク分解を開始します。`)
        break
      case 'estimate':
        handleTimeEstimation(task)
        break
      default:
        break
    }
  }

  const handleTimeEstimation = async (task: Task) => {
    try {
      addMessage('assistant', `「${task.title}」の時間見積もりを計算中...`)
      
      const result = await performTimeEstimation(task, {
        similar_tasks: tasks.filter(t => 
          t.id !== task.id && 
          (t.labels?.some(l => task.labels?.includes(l)) || t.context === task.context)
        ).slice(0, 3)
      })

      const estimationText = `
時間見積もり結果：
- 推定時間: ${formatTaskDuration(result.estimated_duration)}
- 信頼度: ${result.confidence}%
- 範囲: ${formatTaskDuration(result.range.min)} - ${formatTaskDuration(result.range.max)}

${result.reasoning}
      `.trim()

      addMessage('assistant', estimationText, {
        timeEstimation: result
      })
    } catch (error) {
      addMessage('assistant', '時間見積もりに失敗しました。AIプロバイダーの設定を確認してください。')
    }
  }

  const handleGetSuggestions = async () => {
    try {
      addMessage('assistant', 'タスクの改善提案を生成中...')
      
      const suggestions = await getSuggestions(tasks, {
        current_date: selectedDate.toISOString(),
        context: 'task_management'
      })

      if (suggestions.length === 0) {
        addMessage('assistant', '現在、改善提案はありません。タスクの状況が変わったら再度お試しください。')
        return
      }

      const suggestionsText = `
${suggestions.length}個の改善提案があります：

${suggestions.map((suggestion, index) => 
  `${index + 1}. ${suggestion.title}\n   ${suggestion.description}\n   (信頼度: ${suggestion.confidence}%)`
).join('\n\n')}
      `.trim()

      addMessage('assistant', suggestionsText, {
        suggestions
      })
    } catch (error) {
      addMessage('assistant', '改善提案の生成に失敗しました。AIプロバイダーの設定を確認してください。')
    }
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'タスクを分解する':
        if (tasks.length === 1) {
          setSelectedTask(tasks[0])
          setShowBreakdownModal(true)
        } else {
          addMessage('assistant', 'どのタスクを分解しますか？', {
            taskSelection: true,
            action: 'breakdown'
          })
        }
        break
      case '時間を見積もる':
        if (tasks.length === 1) {
          handleTimeEstimation(tasks[0])
        } else {
          addMessage('assistant', 'どのタスクの時間を見積もりますか？', {
            taskSelection: true,
            action: 'estimate'
          })
        }
        break
      case 'スケジュールを最適化する':
        setShowOptimizerModal(true)
        break
      case '改善提案を取得する':
        handleGetSuggestions()
        break
    }
  }

  const getStatusBadge = () => {
    if (!canUseAI) {
      return (
        <Badge variant="outline" className="text-red-600 border-red-200">
          AI未設定
        </Badge>
      )
    }
    
    if (isProcessing) {
      return (
        <Badge className="bg-blue-100 text-blue-700">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          処理中
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="text-green-600 border-green-200">
        AI利用可能
      </Badge>
    )
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className={cn(
              'relative',
              isProcessing && 'bg-blue-50 border-blue-200',
              className
            )}
          >
            <Bot className={cn(
              'h-4 w-4 mr-2',
              isProcessing && 'animate-pulse text-blue-600'
            )} />
            AIアシスタント
            {isProcessing && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-ping" />
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-96 p-0" 
          align="end"
          side="bottom"
          sideOffset={8}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Bot className="h-4 w-4 text-blue-500" />
                  <span>AIアシスタント</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {getStatusBadge()}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettingsModal(true)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {currentOperation && (
                <p className="text-xs text-blue-600">{currentOperation}</p>
              )}
            </CardHeader>
            
            <CardContent className="pt-0">
              {!canUseAI ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    AIを使用するには、プロバイダーの設定が必要です。
                    <Button
                      variant="link"
                      className="p-0 h-auto text-xs ml-1"
                      onClick={() => setShowSettingsModal(true)}
                    >
                      設定する
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {/* Quick Actions */}
                  <div>
                    <p className="text-xs text-gray-600 mb-2">クイックアクション</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => {
                          if (tasks.length === 1) {
                            setSelectedTask(tasks[0])
                            setShowBreakdownModal(true)
                          } else {
                            addMessage('assistant', 'どのタスクを分解しますか？', {
                              taskSelection: true,
                              action: 'breakdown'
                            })
                          }
                        }}
                        disabled={tasks.length === 0}
                      >
                        <Lightbulb className="h-3 w-3 mr-1" />
                        分解
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => {
                          if (tasks.length === 1) {
                            handleTimeEstimation(tasks[0])
                          } else {
                            addMessage('assistant', 'どのタスクの時間を見積もりますか？', {
                              taskSelection: true,
                              action: 'estimate'
                            })
                          }
                        }}
                        disabled={tasks.length === 0}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        見積もり
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => setShowOptimizerModal(true)}
                        disabled={tasks.length === 0}
                      >
                        <Target className="h-3 w-3 mr-1" />
                        最適化
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={handleGetSuggestions}
                        disabled={tasks.length === 0}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        提案
                      </Button>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div>
                    <p className="text-xs text-gray-600 mb-2">会話</p>
                    <ScrollArea className="h-48 border rounded-md p-2">
                      <div className="space-y-2">
                        {chatMessages.map((message) => (
                          <div key={message.id} className={cn(
                            'flex',
                            message.type === 'user' ? 'justify-end' : 'justify-start'
                          )}>
                            <div className={cn(
                              'max-w-[80%] rounded-lg p-2 text-xs',
                              message.type === 'user' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-100 text-gray-800'
                            )}>
                              <p className="whitespace-pre-line">{message.content}</p>
                              
                              {/* Quick suggestions */}
                              {message.metadata?.suggestions && (
                                <div className="mt-2 space-y-1">
                                  {message.metadata.suggestions.map((suggestion: string, index: number) => (
                                    <Button
                                      key={index}
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs h-6 w-full justify-start bg-white/20 hover:bg-white/30"
                                      onClick={() => handleQuickAction(suggestion)}
                                    >
                                      {suggestion}
                                    </Button>
                                  ))}
                                </div>
                              )}
                              
                              {/* Task selection */}
                              {message.metadata?.taskSelection && (
                                <div className="mt-2 space-y-1">
                                  {tasks.slice(0, 3).map((task) => (
                                    <Button
                                      key={task.id}
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs h-6 w-full justify-start bg-white/20 hover:bg-white/30 truncate"
                                      onClick={() => handleTaskSelection(task, message.metadata.action)}
                                    >
                                      {task.title}
                                    </Button>
                                  ))}
                                  {tasks.length > 3 && (
                                    <p className="text-xs opacity-70">他 {tasks.length - 3} 個</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Message Input */}
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Textarea
                        placeholder="AIに質問してください..."
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        className="min-h-[60px] text-xs resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={!currentMessage.trim() || isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{tasks.length}個のタスク</span>
                      <span>Enterで送信</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>

      {/* Modals */}
      {selectedTask && (
        <TaskBreakdownModal
          isOpen={showBreakdownModal}
          onClose={() => {
            setShowBreakdownModal(false)
            setSelectedTask(null)
          }}
          task={selectedTask}
        />
      )}

      <ScheduleOptimizer
        isOpen={showOptimizerModal}
        onClose={() => setShowOptimizerModal(false)}
        tasks={tasks}
        date={selectedDate}
        onOptimizedScheduleAccept={onScheduleApply}
      />

      <AISettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </>
  )
}

export default AIAssistantPopup