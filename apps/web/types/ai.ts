export interface AIProvider {
  id: AIProviderType
  name: string
  models: AIModel[]
  features: AIFeature[]
  pricing: Record<string, ModelPricing>
  maxTokens: number
  supportsStreaming: boolean
  supportsImages: boolean
  supportsFunctionCalling: boolean
}

export type AIProviderType = 'openai' | 'claude' | 'gemini'

export interface AIModel {
  id: string
  name: string
  description: string
  contextWindow: number
  maxOutputTokens: number
  costPer1KTokens: {
    input: number
    output: number
  }
  isDefault?: boolean
}

export interface ModelPricing {
  input: number  // USD per 1K tokens
  output: number // USD per 1K tokens
}

export type AIFeature = 
  | 'task_breakdown'
  | 'time_estimation'
  | 'priority_suggestion'
  | 'scheduling_optimization'
  | 'content_generation'
  | 'analysis_insights'
  | 'natural_language_query'
  | 'smart_categorization'

export interface AISession {
  id: string
  user_id: string
  provider: AIProviderType
  model: string
  session_type: AISessionType
  input_data: AIInputData
  output_data?: AIOutputData
  tokens_used?: number
  cost_usd?: number
  status: AISessionStatus
  error_message?: string
  created_at: string
  completed_at?: string
  metadata?: Record<string, any>
}

export type AISessionType =
  | 'task_breakdown'
  | 'time_estimation'
  | 'priority_analysis'
  | 'schedule_optimization'
  | 'task_suggestion'
  | 'content_generation'
  | 'chat_assistance'
  | 'project_analysis'
  | 'productivity_insights'

export type AISessionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface AIInputData {
  prompt: string
  context?: AIContext
  parameters?: AIParameters
  attachments?: AIAttachment[]
}

export interface AIOutputData {
  response: string
  structured_data?: any
  suggestions?: AISuggestion[]
  confidence_score?: number
  reasoning?: string
  alternatives?: Alternative[]
}

export interface AIContext {
  user_preferences?: UserAIPreferences
  current_tasks?: Task[]
  time_blocks?: TimeBlock[]
  productivity_history?: ProductivityData[]
  calendar_events?: CalendarEvent[]
  project_context?: ProjectContext
}

export interface AIParameters {
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  response_format?: 'text' | 'json' | 'structured'
  functions?: AIFunction[]
}

export interface AIAttachment {
  type: 'image' | 'document' | 'audio'
  url: string
  description?: string
}

export interface AISuggestion {
  id: string
  type: SuggestionType
  title: string
  description: string
  confidence: number // 0-100
  reasoning: string
  action_data?: any
  estimated_impact?: ImpactEstimate
  requires_user_input?: boolean
}

export type SuggestionType =
  | 'task_breakdown'
  | 'time_adjustment'
  | 'priority_change'
  | 'schedule_optimization'
  | 'label_addition'
  | 'context_change'
  | 'energy_alignment'
  | 'dependency_creation'
  | 'automation_setup'

export interface ImpactEstimate {
  productivity_improvement: number // percentage
  time_saved: number // minutes
  stress_reduction: number // 1-10 scale
}

export interface Alternative {
  id: string
  title: string
  description: string
  pros: string[]
  cons: string[]
  estimated_effort: number // hours
  confidence: number // 0-100
}

export interface AIFunction {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required: string[]
  }
}

export interface UserAIPreferences {
  preferred_provider: AIProviderType
  preferred_models: Record<AIProviderType, string>
  auto_suggestions: boolean
  suggestion_frequency: 'low' | 'medium' | 'high'
  auto_apply_suggestions: boolean
  learning_mode: boolean
  privacy_level: 'minimal' | 'balanced' | 'full'
  cost_limit_monthly: number // USD
  languages: string[]
  tone_preference: 'formal' | 'casual' | 'technical' | 'friendly'
}

export interface AIConfiguration {
  providers: Record<AIProviderType, ProviderConfig>
  global_settings: GlobalAISettings
  feature_flags: AIFeatureFlags
}

export interface ProviderConfig {
  enabled: boolean
  api_key_encrypted?: string
  base_url?: string
  default_model: string
  rate_limits: RateLimits
  custom_headers?: Record<string, string>
}

export interface RateLimits {
  requests_per_minute: number
  tokens_per_minute: number
  requests_per_hour: number
  tokens_per_hour: number
  daily_cost_limit: number
}

export interface GlobalAISettings {
  enable_usage_tracking: boolean
  enable_cost_tracking: boolean
  enable_performance_monitoring: boolean
  fallback_provider: AIProviderType
  retry_attempts: number
  timeout_seconds: number
  cache_responses: boolean
  cache_duration_hours: number
}

export interface AIFeatureFlags {
  task_breakdown: boolean
  time_estimation: boolean
  smart_scheduling: boolean
  natural_language_input: boolean
  productivity_insights: boolean
  automated_categorization: boolean
  intelligent_notifications: boolean
  context_aware_suggestions: boolean
}

// Task-specific AI types
export interface TaskBreakdownRequest {
  original_task: Task
  target_subtask_count?: number
  max_subtask_duration?: number // minutes
  preserve_constraints?: boolean
  include_dependencies?: boolean
}

export interface TaskBreakdownResponse {
  subtasks: SubtaskSuggestion[]
  reasoning: string
  estimated_total_time: number
  confidence: number
  warnings?: string[]
}

export interface SubtaskSuggestion {
  title: string
  description: string
  estimated_duration: number // minutes
  priority: TaskPriority
  energy_level: EnergyLevel
  context?: TaskContext
  order: number
  dependencies?: string[]
  labels?: string[]
}

export interface TimeEstimationRequest {
  task: Task
  similar_tasks?: Task[]
  user_history?: ProductivityData[]
  context_factors?: ContextFactor[]
}

export interface TimeEstimationResponse {
  estimated_duration: number // minutes
  confidence: number // 0-100
  reasoning: string
  range: {
    min: number
    max: number
    most_likely: number
  }
  factors: EstimationFactor[]
  historical_comparison?: HistoricalComparison
}

export interface ContextFactor {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
  multiplier: number
  description: string
}

export interface EstimationFactor {
  name: string
  description: string
  weight: number
  current_value: any
  impact_on_duration: number // percentage
}

export interface HistoricalComparison {
  similar_tasks_count: number
  average_duration: number
  variance: number
  accuracy_score: number
}

export interface SchedulingConstraints {
  working_hours: {
    start: string // HH:mm format
    end: string   // HH:mm format
  }
  break_duration: number // minutes
  max_consecutive_work: number // minutes
  blocked_times: Array<{
    start: string
    end: string
    reason?: string
  }>
  energy_levels: {
    high: string[] // time ranges
    low: string[]  // time ranges
  }
  mandatory_breaks: boolean
  weekend_work: boolean
}

export interface SchedulingPreferences {
  prefer_morning: boolean
  prefer_afternoon: boolean
  prefer_evening: boolean
  batch_similar_tasks: boolean
  minimize_context_switching: boolean
  respect_deadlines: boolean
  optimize_for_energy: boolean
  allow_overtime: boolean
  buffer_time_percentage: number // 0-100
}

export interface ScheduleOptimizationRequest {
  tasks: Task[]
  time_blocks: TimeBlock[]
  constraints: SchedulingConstraints
  preferences: SchedulingPreferences
  optimization_goals: OptimizationGoal[]
}

export interface ScheduleOptimizationResponse {
  optimized_schedule: OptimizedTimelineSlot[]
  improvements: ScheduleImprovement[]
  metrics: OptimizationMetrics
  alternative_schedules?: AlternativeSchedule[]
  reasoning: string
}

export interface OptimizedTimelineSlot {
  task_id: string
  start_time: string
  end_time: string
  confidence: number
  reasoning: string
  energy_alignment: number // 0-100
  context_score: number // 0-100
}

export interface ScheduleImprovement {
  type: 'efficiency' | 'energy_alignment' | 'context_optimization' | 'conflict_resolution'
  description: string
  impact: ImpactEstimate
  before_value: number
  after_value: number
}

export interface OptimizationMetrics {
  total_efficiency_score: number // 0-100
  energy_alignment_score: number // 0-100
  context_optimization_score: number // 0-100
  conflict_count: number
  wasted_time_minutes: number
  productivity_index: number // 0-100
}

export interface OptimizationGoal {
  type: 'maximize_productivity' | 'minimize_stress' | 'balance_energy' | 'reduce_context_switching'
  weight: number // 0-1
  constraints?: any
}

export interface AlternativeSchedule {
  id: string
  name: string
  description: string
  metrics: OptimizationMetrics
  trade_offs: string[]
  schedule: OptimizedTimelineSlot[]
}

export interface AIInsight {
  id: string
  type: InsightType
  title: string
  description: string
  data_points: DataPoint[]
  recommendations: Recommendation[]
  confidence: number
  generated_at: string
  valid_until?: string
}

export type InsightType =
  | 'productivity_pattern'
  | 'energy_optimization'
  | 'time_allocation'
  | 'efficiency_improvement'
  | 'stress_indicators'
  | 'goal_progress'
  | 'habit_formation'

export interface DataPoint {
  metric: string
  value: number
  trend: 'increasing' | 'decreasing' | 'stable'
  comparison_period: string
  significance: 'high' | 'medium' | 'low'
}

export interface Recommendation {
  id: string
  title: string
  description: string
  action_type: RecommendationAction
  implementation_effort: 'low' | 'medium' | 'high'
  expected_impact: ImpactEstimate
  prerequisites?: string[]
  step_by_step?: string[]
}

export type RecommendationAction =
  | 'adjust_schedule'
  | 'modify_time_blocks'
  | 'change_task_priorities'
  | 'add_break_time'
  | 'batch_similar_tasks'
  | 'relocate_tasks'
  | 'set_boundaries'
  | 'use_automation'

export interface AIUsageStatistics {
  total_sessions: number
  total_tokens_used: number
  total_cost_usd: number
  sessions_by_type: Record<AISessionType, number>
  sessions_by_provider: Record<AIProviderType, number>
  average_response_time: number // seconds
  success_rate: number // percentage
  cost_by_provider: Record<AIProviderType, number>
  monthly_usage: MonthlyUsage[]
}

export interface MonthlyUsage {
  month: string // YYYY-MM
  sessions: number
  tokens: number
  cost_usd: number
  top_features: string[]
}

export interface AIError {
  code: string
  message: string
  provider?: AIProviderType
  model?: string
  retry_after?: number
  context?: any
}

// Import related types
import type { Task, TaskPriority, TaskContext, EnergyLevel } from './tasks'
import type { TimeBlock } from './timeline'
import type { SchedulingConstraints, SchedulingPreferences } from './timeline'

export interface ProductivityData {
  date: string
  completion_rate: number
  efficiency_score: number
  focus_time: number
  break_time: number
  task_count: number
  energy_levels: Record<EnergyLevel, number>
}

export interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  type: 'meeting' | 'event' | 'appointment' | 'block'
}

export interface ProjectContext {
  id: string
  name: string
  description?: string
  goals?: string[]
  deadline?: string
  team_size?: number
  budget?: number
  technology_stack?: string[]
}