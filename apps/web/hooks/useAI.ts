'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { 
  TaskBreakdownService,
  TimeEstimationService,
  ScheduleOptimizationService,
  TaskSuggestionsService,
  getUserAIPreferences,
  createAIService
} from '@/lib/ai/task-intelligence'
import { 
  AIServiceFactory,
  getAvailableProviders,
  selectBestProvider
} from '@/lib/ai/providers'
import { supabase } from '@/lib/supabase'
import type { 
  AIProviderType,
  AIFeature,
  TaskBreakdownRequest,
  TaskBreakdownResponse,
  TimeEstimationRequest,
  TimeEstimationResponse,
  ScheduleOptimizationRequest,
  ScheduleOptimizationResponse,
  AISuggestion,
  UserAIPreferences,
  AIUsageStatistics
} from '@/types/ai'
import type { Task } from '@/types/tasks'

// AI Task Breakdown Hook
export function useTaskBreakdown() {
  const { toast } = useToast()
  
  return useMutation<TaskBreakdownResponse, Error, { request: TaskBreakdownRequest; provider: AIProviderType; apiKey: string }>({
    mutationFn: async ({ request, provider, apiKey }) => {
      const service = new TaskBreakdownService(provider, apiKey)
      return await service.breakdownTask(request)
    },
    onSuccess: (data) => {
      toast({
        title: "タスク分解完了",
        description: `${data.subtasks.length}個のサブタスクに分解されました`,
      })
    },
    onError: (error) => {
      toast({
        title: "タスク分解に失敗",
        description: error.message,
        variant: "destructive",
      })
    }
  })
}

// AI Time Estimation Hook
export function useTimeEstimation() {
  const { toast } = useToast()
  
  return useMutation<TimeEstimationResponse, Error, { request: TimeEstimationRequest; provider: AIProviderType; apiKey: string }>({
    mutationFn: async ({ request, provider, apiKey }) => {
      const service = new TimeEstimationService(provider, apiKey)
      return await service.estimateTime(request)
    },
    onSuccess: (data) => {
      toast({
        title: "時間見積もり完了",
        description: `推定時間: ${data.estimated_duration}分（信頼度: ${data.confidence}%）`,
      })
    },
    onError: (error) => {
      toast({
        title: "時間見積もりに失敗",
        description: error.message,
        variant: "destructive",
      })
    }
  })
}

// AI Schedule Optimization Hook
export function useScheduleOptimization() {
  const { toast } = useToast()
  
  return useMutation<ScheduleOptimizationResponse, Error, { request: ScheduleOptimizationRequest; provider: AIProviderType; apiKey: string }>({
    mutationFn: async ({ request, provider, apiKey }) => {
      const service = new ScheduleOptimizationService(provider, apiKey)
      return await service.optimizeSchedule(request)
    },
    onSuccess: (data) => {
      toast({
        title: "スケジュール最適化完了",
        description: `効率スコア: ${data.metrics.total_efficiency_score}%`,
      })
    },
    onError: (error) => {
      toast({
        title: "スケジュール最適化に失敗",
        description: error.message,
        variant: "destructive",
      })
    }
  })
}

// AI Task Suggestions Hook
export function useTaskSuggestions() {
  const { toast } = useToast()
  
  return useMutation<AISuggestion[], Error, { tasks: Task[]; provider: AIProviderType; apiKey: string; context?: any }>({
    mutationFn: async ({ tasks, provider, apiKey, context = {} }) => {
      const service = new TaskSuggestionsService(provider, apiKey)
      return await service.generateSuggestions(tasks, context)
    },
    onSuccess: (data) => {
      toast({
        title: "AIの提案を取得",
        description: `${data.length}個の改善提案があります`,
      })
    },
    onError: (error) => {
      toast({
        title: "提案の取得に失敗",
        description: error.message,
        variant: "destructive",
      })
    }
  })
}

// AI Preferences Hook
export function useAIPreferences() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const preferencesQuery = useQuery<UserAIPreferences>({
    queryKey: ['ai-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      return await getUserAIPreferences(user.id)
    }
  })

  const updatePreferences = useMutation<void, Error, Partial<UserAIPreferences>>({
    mutationFn: async (preferences) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      const { error } = await supabase
        .from('users')
        .update({ ai_preferences: { ...preferencesQuery.data, ...preferences } })
        .eq('id', user.id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-preferences'] })
      toast({
        title: "AI設定を更新しました",
      })
    },
    onError: (error) => {
      toast({
        title: "設定の更新に失敗",
        description: error.message,
        variant: "destructive",
      })
    }
  })

  return {
    preferences: preferencesQuery.data,
    isLoading: preferencesQuery.isLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending
  }
}

// AI Usage Statistics Hook
export function useAIUsageStatistics() {
  return useQuery<AIUsageStatistics>({
    queryKey: ['ai-usage-statistics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get AI sessions data
      const { data: sessions, error } = await supabase
        .from('ai_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Calculate statistics
      const totalSessions = sessions.length
      const totalCost = sessions.reduce((sum, session) => sum + (session.cost_usd || 0), 0)
      const totalTokens = sessions.reduce((sum, session) => sum + (session.tokens_used || 0), 0)

      const sessionsByType = sessions.reduce((acc, session) => {
        acc[session.session_type] = (acc[session.session_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const sessionsByProvider = sessions.reduce((acc, session) => {
        acc[session.provider] = (acc[session.provider] || 0) + 1
        return acc
      }, {} as Record<AIProviderType, number>)

      const costByProvider = sessions.reduce((acc, session) => {
        acc[session.provider] = (acc[session.provider] || 0) + (session.cost_usd || 0)
        return acc
      }, {} as Record<AIProviderType, number>)

      const successRate = sessions.length > 0 ? 
        (sessions.filter(s => s.status === 'completed').length / sessions.length) * 100 : 0

      const avgResponseTime = sessions.length > 0 ?
        sessions.reduce((sum, session) => {
          if (session.completed_at && session.created_at) {
            const responseTime = (new Date(session.completed_at).getTime() - new Date(session.created_at).getTime()) / 1000
            return sum + responseTime
          }
          return sum
        }, 0) / sessions.length : 0

      // Monthly usage
      const monthlyUsage = sessions.reduce((acc, session) => {
        const month = new Date(session.created_at).toISOString().slice(0, 7) // YYYY-MM
        const existing = acc.find(m => m.month === month)
        
        if (existing) {
          existing.sessions += 1
          existing.tokens += session.tokens_used || 0
          existing.cost_usd += session.cost_usd || 0
        } else {
          acc.push({
            month,
            sessions: 1,
            tokens: session.tokens_used || 0,
            cost_usd: session.cost_usd || 0,
            top_features: [session.session_type]
          })
        }
        
        return acc
      }, [] as MonthlyUsage[])

      return {
        total_sessions: totalSessions,
        total_tokens_used: totalTokens,
        total_cost_usd: totalCost,
        sessions_by_type: sessionsByType,
        sessions_by_provider: sessionsByProvider,
        average_response_time: avgResponseTime,
        success_rate: successRate,
        cost_by_provider: costByProvider,
        monthly_usage: monthlyUsage
      }
    },
    refetchInterval: 60000 // Refetch every minute
  })
}

// AI Provider Management Hook
export function useAIProviders() {
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType | null>(null)
  
  const availableProviders = getAvailableProviders()
  
  const selectOptimalProvider = useCallback((requirements: {
    features: AIFeature[]
    maxCost?: number
    maxLatency?: number
    preferAccuracy?: boolean
  }) => {
    try {
      const optimal = selectBestProvider(requirements)
      setSelectedProvider(optimal)
      return optimal
    } catch (error) {
      console.error('Failed to select optimal provider:', error)
      return null
    }
  }, [])

  const validateApiKey = useCallback(async (provider: AIProviderType, apiKey: string): Promise<boolean> => {
    try {
      const service = AIServiceFactory.createService(provider, apiKey)
      
      // Test with a simple completion
      const testInput = {
        prompt: 'Hello, please respond with "OK" if you can receive this message.',
        parameters: {
          max_tokens: 10,
          temperature: 0
        }
      }
      
      const result = await service.generateCompletion(testInput)
      return result.response.toLowerCase().includes('ok')
    } catch (error) {
      console.error('API key validation failed:', error)
      return false
    }
  }, [])

  return {
    availableProviders,
    selectedProvider,
    setSelectedProvider,
    selectOptimalProvider,
    validateApiKey
  }
}

// Combined AI Assistant Hook
export function useAIAssistant() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentOperation, setCurrentOperation] = useState<string | null>(null)
  
  const taskBreakdown = useTaskBreakdown()
  const timeEstimation = useTimeEstimation()
  const scheduleOptimization = useScheduleOptimization()
  const taskSuggestions = useTaskSuggestions()
  const { preferences } = useAIPreferences()
  const { selectOptimalProvider } = useAIProviders()

  const performTaskBreakdown = useCallback(async (task: Task, options?: Partial<TaskBreakdownRequest>) => {
    if (!preferences?.preferred_provider) {
      throw new Error('AI provider not configured')
    }

    setIsProcessing(true)
    setCurrentOperation('タスク分解中...')
    
    try {
      const apiKey = await getProviderApiKey(preferences.preferred_provider)
      const request: TaskBreakdownRequest = {
        original_task: task,
        target_subtask_count: 5,
        max_subtask_duration: 60,
        ...options
      }
      
      const result = await taskBreakdown.mutateAsync({
        request,
        provider: preferences.preferred_provider,
        apiKey
      })
      
      return result
    } finally {
      setIsProcessing(false)
      setCurrentOperation(null)
    }
  }, [preferences, taskBreakdown])

  const performTimeEstimation = useCallback(async (task: Task, options?: Partial<TimeEstimationRequest>) => {
    if (!preferences?.preferred_provider) {
      throw new Error('AI provider not configured')
    }

    setIsProcessing(true)
    setCurrentOperation('時間見積もり中...')
    
    try {
      const apiKey = await getProviderApiKey(preferences.preferred_provider)
      const request: TimeEstimationRequest = {
        task,
        ...options
      }
      
      const result = await timeEstimation.mutateAsync({
        request,
        provider: preferences.preferred_provider,
        apiKey
      })
      
      return result
    } finally {
      setIsProcessing(false)
      setCurrentOperation(null)
    }
  }, [preferences, timeEstimation])

  const performScheduleOptimization = useCallback(async (
    tasks: Task[], 
    options: Partial<ScheduleOptimizationRequest>
  ) => {
    if (!preferences?.preferred_provider) {
      throw new Error('AI provider not configured')
    }

    setIsProcessing(true)
    setCurrentOperation('スケジュール最適化中...')
    
    try {
      const apiKey = await getProviderApiKey(preferences.preferred_provider)
      const request: ScheduleOptimizationRequest = {
        tasks,
        time_blocks: [],
        constraints: {
          working_hours: { start: 9, end: 17 },
          break_duration: 15,
          focus_session_duration: 25,
          buffer_time: 5,
          respect_energy_levels: true,
          respect_contexts: true
        },
        preferences: {
          prefer_morning: false,
          prefer_afternoon: false,
          group_similar_tasks: true,
          minimize_context_switches: true
        },
        optimization_goals: [
          { type: 'maximize_productivity', weight: 0.7 },
          { type: 'balance_energy', weight: 0.3 }
        ],
        ...options
      }
      
      const result = await scheduleOptimization.mutateAsync({
        request,
        provider: preferences.preferred_provider,
        apiKey
      })
      
      return result
    } finally {
      setIsProcessing(false)
      setCurrentOperation(null)
    }
  }, [preferences, scheduleOptimization])

  const getSuggestions = useCallback(async (tasks: Task[], context?: any) => {
    if (!preferences?.preferred_provider) {
      throw new Error('AI provider not configured')
    }

    setIsProcessing(true)
    setCurrentOperation('提案を生成中...')
    
    try {
      const apiKey = await getProviderApiKey(preferences.preferred_provider)
      
      const result = await taskSuggestions.mutateAsync({
        tasks,
        provider: preferences.preferred_provider,
        apiKey,
        context
      })
      
      return result
    } finally {
      setIsProcessing(false)
      setCurrentOperation(null)
    }
  }, [preferences, taskSuggestions])

  return {
    isProcessing,
    currentOperation,
    performTaskBreakdown,
    performTimeEstimation,
    performScheduleOptimization,
    getSuggestions,
    canUseAI: !!preferences?.preferred_provider
  }
}

// Helper function to get API key from secure storage
async function getProviderApiKey(provider: AIProviderType): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data: keys, error } = await supabase
    .from('user_api_keys')
    .select('encrypted_key')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .eq('key_type', 'ai_provider')
    .single()

  if (error || !keys) {
    throw new Error(`API key not found for ${provider}`)
  }

  // In a real implementation, you would decrypt the key here
  // For now, we'll assume it's stored in a usable format
  return keys.encrypted_key
}