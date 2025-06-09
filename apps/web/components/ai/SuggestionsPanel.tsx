'use client'

import { useState, useEffect } from 'react'
import { useAIAssistant } from '@/hooks/useAI'
import { useUpdateTask } from '@/hooks/useTasks'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Lightbulb,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  TrendingUp,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Sparkles,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/tasks'
import type { AISuggestion } from '@/types/ai'

interface SuggestionsPanelProps {
  tasks: Task[]
  context?: any
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function SuggestionsPanel({ 
  tasks, 
  context = {}, 
  className,
  autoRefresh = false,
  refreshInterval = 300000 // 5 minutes
}: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set())
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const { getSuggestions, isProcessing } = useAIAssistant()
  const updateTaskMutation = useUpdateTask()
  const queryClient = useQueryClient()

  // Load suggestions on mount and when tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      handleRefreshSuggestions()
    }
  }, [tasks.length])

  // Auto-refresh suggestions
  useEffect(() => {
    if (!autoRefresh || tasks.length === 0) return

    const interval = setInterval(() => {
      handleRefreshSuggestions()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, tasks.length])

  const handleRefreshSuggestions = async () => {
    if (tasks.length === 0) return

    setIsRefreshing(true)
    try {
      const newSuggestions = await getSuggestions(tasks, context)
      
      // Filter out already applied or dismissed suggestions
      const filteredSuggestions = newSuggestions.filter(suggestion => 
        !appliedSuggestions.has(suggestion.id) && 
        !dismissedSuggestions.has(suggestion.id)
      )
      
      setSuggestions(filteredSuggestions)
    } catch (error) {
      console.error('Failed to refresh suggestions:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleApplySuggestion = async (suggestion: AISuggestion) => {
    try {
      const { action_data } = suggestion
      
      if (!action_data?.task_id || !action_data?.changes) {
        console.error('Invalid suggestion action data')
        return
      }

      // Apply the suggested changes to the task
      await updateTaskMutation.mutateAsync({
        id: action_data.task_id,
        ...action_data.changes
      })

      // Mark suggestion as applied
      setAppliedSuggestions(prev => {
        const newSet = new Set(prev)
        newSet.add(suggestion.id)
        return newSet
      })
      
      // Remove from current suggestions
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))

      // Log the suggestion acceptance
      await logSuggestionFeedback(suggestion.id, 'accepted')
      
    } catch (error) {
      console.error('Failed to apply suggestion:', error)
    }
  }

  const handleDismissSuggestion = async (suggestion: AISuggestion) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestion.id]))
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
    
    await logSuggestionFeedback(suggestion.id, 'dismissed')
  }

  const handleSuggestionFeedback = async (suggestion: AISuggestion, feedback: 'helpful' | 'not_helpful') => {
    await logSuggestionFeedback(suggestion.id, feedback)
  }

  const logSuggestionFeedback = async (suggestionId: string, feedback: string) => {
    try {
      // Log feedback to analytics/learning system
      // This would be implemented to improve AI suggestions over time
      console.log('Suggestion feedback:', { suggestionId, feedback })
    } catch (error) {
      console.error('Failed to log suggestion feedback:', error)
    }
  }

  const toggleSuggestionExpanded = (suggestionId: string) => {
    setExpandedSuggestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(suggestionId)) {
        newSet.delete(suggestionId)
      } else {
        newSet.add(suggestionId)
      }
      return newSet
    })
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'time_adjustment': return <Clock className="h-4 w-4" />
      case 'priority_change': return <AlertTriangle className="h-4 w-4" />
      case 'energy_alignment': return <Zap className="h-4 w-4" />
      case 'schedule_optimization': return <TrendingUp className="h-4 w-4" />
      default: return <Lightbulb className="h-4 w-4" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800'
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getImpactBadges = (impact?: any) => {
    if (!impact) return null

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {impact.productivity_improvement > 0 && (
          <Badge variant="outline" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            生産性 +{impact.productivity_improvement}%
          </Badge>
        )}
        {impact.time_saved > 0 && (
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            時間節約 {impact.time_saved}分
          </Badge>
        )}
        {impact.stress_reduction > 0 && (
          <Badge variant="outline" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            ストレス -{impact.stress_reduction}
          </Badge>
        )}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="py-8 text-center text-gray-500">
          <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">タスクを追加すると、AIの提案が表示されます</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span>AI提案</span>
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {suggestions.length}
              </Badge>
            )}
          </CardTitle>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshSuggestions}
            disabled={isProcessing || isRefreshing}
          >
            {(isProcessing || isRefreshing) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isProcessing && suggestions.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-500 mb-3" />
            <p className="text-sm text-gray-500">AI提案を生成中...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">現在、提案はありません</p>
            <p className="text-xs mt-1">タスクを更新すると新しい提案が表示される場合があります</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <Collapsible key={suggestion.id}>
                <Card className="border border-gray-200">
                  <CollapsibleTrigger asChild>
                    <CardHeader 
                      className="pb-2 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleSuggestionExpanded(suggestion.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2 flex-1">
                          <div className="text-blue-500 mt-0.5">
                            {getSuggestionIcon(suggestion.type)}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{suggestion.title}</h4>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {suggestion.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge className={cn('text-xs', getConfidenceColor(suggestion.confidence))}>
                                信頼度 {suggestion.confidence}%
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {suggestion.type === 'time_adjustment' ? '時間調整' :
                                 suggestion.type === 'priority_change' ? '優先度変更' :
                                 suggestion.type === 'energy_alignment' ? 'エネルギー調整' :
                                 suggestion.type === 'schedule_optimization' ? 'スケジュール最適化' :
                                 suggestion.type === 'label_addition' ? 'ラベル追加' :
                                 suggestion.type === 'context_change' ? 'コンテキスト変更' : suggestion.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          {expandedSuggestions.has(suggestion.id) ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {/* Detailed reasoning */}
                        <div>
                          <h5 className="text-xs font-medium text-gray-700 mb-1">詳細説明</h5>
                          <p className="text-xs text-gray-600">{suggestion.reasoning}</p>
                        </div>

                        {/* Expected impact */}
                        {suggestion.estimated_impact && getImpactBadges(suggestion.estimated_impact)}

                        {/* Action required indicator */}
                        {suggestion.requires_user_input && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              この提案を適用するには、追加の入力が必要です
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSuggestionFeedback(suggestion, 'helpful')}
                            >
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              <span className="text-xs">役立つ</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSuggestionFeedback(suggestion, 'not_helpful')}
                            >
                              <ThumbsDown className="h-3 w-3 mr-1" />
                              <span className="text-xs">役立たない</span>
                            </Button>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDismissSuggestion(suggestion)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              <span className="text-xs">却下</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApplySuggestion(suggestion)}
                              disabled={suggestion.requires_user_input || updateTaskMutation.isPending}
                            >
                              {updateTaskMutation.isPending ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              )}
                              <span className="text-xs">適用</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SuggestionsPanel