import { supabase } from '../supabase'
import { AIServiceFactory, getDefaultModel } from './providers'
import type {
  TaskBreakdownRequest,
  TaskBreakdownResponse,
  TimeEstimationRequest,
  TimeEstimationResponse,
  ScheduleOptimizationRequest,
  ScheduleOptimizationResponse,
  AISuggestion,
  AIProviderType,
  AISession,
  AIInputData
} from '@/types/ai'
import type { Task } from '@/types/tasks'

// Task Breakdown AI Service
export class TaskBreakdownService {
  private provider: AIProviderType
  private apiKey: string

  constructor(provider: AIProviderType, apiKey: string) {
    this.provider = provider
    this.apiKey = apiKey
  }

  async breakdownTask(request: TaskBreakdownRequest): Promise<TaskBreakdownResponse> {
    const service = AIServiceFactory.createService(this.provider, this.apiKey)
    const model = getDefaultModel(this.provider)

    const prompt = this.buildTaskBreakdownPrompt(request)
    
    const input: AIInputData = {
      prompt,
      context: {
        current_tasks: [request.original_task]
      },
      parameters: {
        temperature: 0.3, // Lower temperature for more consistent structure
        max_tokens: 1000,
        response_format: 'json'
      }
    }

    try {
      const output = await service.generateCompletion(input, model)
      
      // Log the AI session
      await this.logAISession(request, output, 'task_breakdown')

      return this.parseTaskBreakdownResponse(output.response, request)
    } catch (error) {
      throw new Error(`Task breakdown failed: ${error.message}`)
    }
  }

  private buildTaskBreakdownPrompt(request: TaskBreakdownRequest): string {
    const { original_task, target_subtask_count = 5, max_subtask_duration = 60 } = request

    return `
You are TaskTimeFlow AI, an expert at breaking down complex tasks into manageable subtasks.

## Task to Break Down:
**Title:** ${original_task.title}
**Description:** ${original_task.description || 'No description provided'}
**Estimated Duration:** ${original_task.estimated_duration || 'Not specified'} minutes
**Priority:** ${original_task.priority}
**Energy Level:** ${original_task.energy_level || 'Not specified'}
**Context:** ${original_task.context || 'Any'}
**Labels:** ${original_task.labels?.join(', ') || 'None'}

## Requirements:
- Break down into ${target_subtask_count} subtasks (approximately)
- Each subtask should take no more than ${max_subtask_duration} minutes
- Maintain logical sequence and dependencies
- Preserve the overall priority and context where appropriate
- Consider energy levels for different types of work

## Response Format (JSON):
{
  "subtasks": [
    {
      "title": "Clear, actionable subtask title",
      "description": "Detailed description of what needs to be done",
      "estimated_duration": 30,
      "priority": "high|medium|low|urgent",
      "energy_level": "high|medium|low",
      "context": "pc_required|anywhere|home_only|office_only|phone_only",
      "order": 1,
      "dependencies": ["previous_subtask_title"],
      "labels": ["label1", "label2"]
    }
  ],
  "reasoning": "Explanation of the breakdown strategy",
  "estimated_total_time": 180,
  "confidence": 85,
  "warnings": ["Any potential issues or considerations"]
}

Provide a thoughtful breakdown that makes the original task more manageable and actionable.
    `.trim()
  }

  private parseTaskBreakdownResponse(response: string, request: TaskBreakdownRequest): TaskBreakdownResponse {
    try {
      const parsed = JSON.parse(response)
      
      return {
        subtasks: parsed.subtasks || [],
        reasoning: parsed.reasoning || 'No reasoning provided',
        estimated_total_time: parsed.estimated_total_time || 0,
        confidence: Math.min(Math.max(parsed.confidence || 70, 0), 100),
        warnings: parsed.warnings || []
      }
    } catch (error) {
      throw new Error('Failed to parse task breakdown response')
    }
  }

  private async logAISession(request: any, output: any, sessionType: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('ai_sessions').insert({
        user_id: user.id,
        provider: this.provider,
        session_type: sessionType,
        input_data: { prompt: 'Task breakdown request', context: request },
        output_data: output,
        status: 'completed'
      })
    } catch (error) {
      console.error('Failed to log AI session:', error)
    }
  }
}

// Time Estimation AI Service
export class TimeEstimationService {
  private provider: AIProviderType
  private apiKey: string

  constructor(provider: AIProviderType, apiKey: string) {
    this.provider = provider
    this.apiKey = apiKey
  }

  async estimateTime(request: TimeEstimationRequest): Promise<TimeEstimationResponse> {
    const service = AIServiceFactory.createService(this.provider, this.apiKey)
    const model = getDefaultModel(this.provider)

    const prompt = this.buildTimeEstimationPrompt(request)
    
    const input: AIInputData = {
      prompt,
      context: {
        current_tasks: [request.task],
        productivity_history: request.user_history
      },
      parameters: {
        temperature: 0.4,
        max_tokens: 800,
        response_format: 'json'
      }
    }

    try {
      const output = await service.generateCompletion(input, model)
      
      await this.logAISession(request, output, 'time_estimation')

      return this.parseTimeEstimationResponse(output.response, request)
    } catch (error) {
      throw new Error(`Time estimation failed: ${error.message}`)
    }
  }

  private buildTimeEstimationPrompt(request: TimeEstimationRequest): string {
    const { task, similar_tasks = [], user_history = [] } = request

    const historicalData = this.formatHistoricalData(similar_tasks, user_history)

    return `
You are TaskTimeFlow AI, an expert at estimating task completion times based on historical data and task complexity.

## Task to Estimate:
**Title:** ${task.title}
**Description:** ${task.description || 'No description provided'}
**Priority:** ${task.priority}
**Energy Level:** ${task.energy_level || 'Not specified'}
**Context:** ${task.context || 'Any'}
**Labels:** ${task.labels?.join(', ') || 'None'}
**Current Estimate:** ${task.estimated_duration ? `${task.estimated_duration} minutes` : 'None'}

## Historical Context:
${historicalData}

## Estimation Factors to Consider:
- Task complexity and scope
- Required energy level and focus
- Context constraints (location, tools needed)
- Historical performance on similar tasks
- Potential blockers or dependencies
- Time of day and energy alignment

## Response Format (JSON):
{
  "estimated_duration": 90,
  "confidence": 75,
  "reasoning": "Detailed explanation of the estimation logic",
  "range": {
    "min": 60,
    "max": 120,
    "most_likely": 90
  },
  "factors": [
    {
      "name": "Task Complexity",
      "description": "Analysis of task complexity",
      "weight": 0.3,
      "current_value": "medium",
      "impact_on_duration": 15
    }
  ],
  "historical_comparison": {
    "similar_tasks_count": 3,
    "average_duration": 85,
    "variance": 20,
    "accuracy_score": 80
  }
}

Provide a realistic time estimate based on the available data and task characteristics.
    `.trim()
  }

  private formatHistoricalData(similarTasks: Task[], userHistory: any[]): string {
    if (similarTasks.length === 0 && userHistory.length === 0) {
      return 'No historical data available.'
    }

    let data = ''
    
    if (similarTasks.length > 0) {
      data += '### Similar Tasks:\n'
      similarTasks.forEach((task, index) => {
        data += `${index + 1}. "${task.title}" - Estimated: ${task.estimated_duration || 'N/A'}min, Actual: ${task.actual_duration || 'N/A'}min\n`
      })
      data += '\n'
    }

    if (userHistory.length > 0) {
      data += '### User Productivity History:\n'
      userHistory.slice(0, 5).forEach((record, index) => {
        data += `${index + 1}. Date: ${record.date}, Completion Rate: ${record.completion_rate}%, Efficiency: ${record.efficiency_score}%\n`
      })
    }

    return data
  }

  private parseTimeEstimationResponse(response: string, request: TimeEstimationRequest): TimeEstimationResponse {
    try {
      const parsed = JSON.parse(response)
      
      return {
        estimated_duration: parsed.estimated_duration || 60,
        confidence: Math.min(Math.max(parsed.confidence || 70, 0), 100),
        reasoning: parsed.reasoning || 'No reasoning provided',
        range: parsed.range || {
          min: parsed.estimated_duration * 0.7,
          max: parsed.estimated_duration * 1.3,
          most_likely: parsed.estimated_duration
        },
        factors: parsed.factors || [],
        historical_comparison: parsed.historical_comparison
      }
    } catch (error) {
      throw new Error('Failed to parse time estimation response')
    }
  }

  private async logAISession(request: any, output: any, sessionType: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('ai_sessions').insert({
        user_id: user.id,
        provider: this.provider,
        session_type: sessionType,
        input_data: { prompt: 'Time estimation request', context: request },
        output_data: output,
        status: 'completed'
      })
    } catch (error) {
      console.error('Failed to log AI session:', error)
    }
  }
}

// Schedule Optimization AI Service
export class ScheduleOptimizationService {
  private provider: AIProviderType
  private apiKey: string

  constructor(provider: AIProviderType, apiKey: string) {
    this.provider = provider
    this.apiKey = apiKey
  }

  async optimizeSchedule(request: ScheduleOptimizationRequest): Promise<ScheduleOptimizationResponse> {
    const service = AIServiceFactory.createService(this.provider, this.apiKey)
    const model = getDefaultModel(this.provider)

    const prompt = this.buildScheduleOptimizationPrompt(request)
    
    const input: AIInputData = {
      prompt,
      context: {
        current_tasks: request.tasks,
        time_blocks: request.time_blocks
      },
      parameters: {
        temperature: 0.2, // Low temperature for consistent scheduling
        max_tokens: 1500,
        response_format: 'json'
      }
    }

    try {
      const output = await service.generateCompletion(input, model)
      
      await this.logAISession(request, output, 'schedule_optimization')

      return this.parseScheduleOptimizationResponse(output.response, request)
    } catch (error) {
      throw new Error(`Schedule optimization failed: ${error.message}`)
    }
  }

  private buildScheduleOptimizationPrompt(request: ScheduleOptimizationRequest): string {
    const { tasks, time_blocks, constraints, preferences, optimization_goals } = request

    const tasksData = tasks.map(task => ({
      id: task.id,
      title: task.title,
      duration: task.estimated_duration || 60,
      priority: task.priority,
      energy_level: task.energy_level,
      context: task.context
    }))

    const timeBlocksData = time_blocks.map(block => ({
      start_hour: block.start_hour,
      end_hour: block.end_hour,
      label: block.label,
      energy_level: block.energy_level,
      is_work_time: block.is_work_time
    }))

    return `
You are TaskTimeFlow AI, an expert at optimizing daily schedules for maximum productivity and energy alignment.

## Tasks to Schedule:
${JSON.stringify(tasksData, null, 2)}

## Available Time Blocks:
${JSON.stringify(timeBlocksData, null, 2)}

## Constraints:
- Working Hours: ${constraints.working_hours.start}:00 - ${constraints.working_hours.end}:00
- Break Duration: ${constraints.break_duration} minutes
- Focus Session Duration: ${constraints.focus_session_duration} minutes
- Buffer Time: ${constraints.buffer_time} minutes between tasks
- Respect Energy Levels: ${constraints.respect_energy_levels}
- Respect Contexts: ${constraints.respect_contexts}

## Preferences:
- Prefer Morning: ${preferences.prefer_morning}
- Prefer Afternoon: ${preferences.prefer_afternoon}
- Group Similar Tasks: ${preferences.group_similar_tasks}
- Minimize Context Switches: ${preferences.minimize_context_switches}

## Optimization Goals:
${optimization_goals.map(goal => `- ${goal.type} (weight: ${goal.weight})`).join('\n')}

## Response Format (JSON):
{
  "optimized_schedule": [
    {
      "task_id": "task-id",
      "start_time": "2024-01-15T09:00:00Z",
      "end_time": "2024-01-15T10:30:00Z",
      "confidence": 85,
      "reasoning": "Why this slot was chosen",
      "energy_alignment": 90,
      "context_score": 95
    }
  ],
  "improvements": [
    {
      "type": "efficiency",
      "description": "Improved overall efficiency",
      "impact": {
        "productivity_improvement": 15,
        "time_saved": 30,
        "stress_reduction": 3
      },
      "before_value": 70,
      "after_value": 85
    }
  ],
  "metrics": {
    "total_efficiency_score": 85,
    "energy_alignment_score": 90,
    "context_optimization_score": 80,
    "conflict_count": 0,
    "wasted_time_minutes": 15,
    "productivity_index": 88
  },
  "reasoning": "Overall optimization strategy explanation"
}

Create an optimal schedule that maximizes productivity while respecting energy levels and constraints.
    `.trim()
  }

  private parseScheduleOptimizationResponse(response: string, request: ScheduleOptimizationRequest): ScheduleOptimizationResponse {
    try {
      const parsed = JSON.parse(response)
      
      return {
        optimized_schedule: parsed.optimized_schedule || [],
        improvements: parsed.improvements || [],
        metrics: parsed.metrics || {
          total_efficiency_score: 0,
          energy_alignment_score: 0,
          context_optimization_score: 0,
          conflict_count: 0,
          wasted_time_minutes: 0,
          productivity_index: 0
        },
        reasoning: parsed.reasoning || 'No reasoning provided',
        alternative_schedules: parsed.alternative_schedules
      }
    } catch (error) {
      throw new Error('Failed to parse schedule optimization response')
    }
  }

  private async logAISession(request: any, output: any, sessionType: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('ai_sessions').insert({
        user_id: user.id,
        provider: this.provider,
        session_type: sessionType,
        input_data: { prompt: 'Schedule optimization request', context: request },
        output_data: output,
        status: 'completed'
      })
    } catch (error) {
      console.error('Failed to log AI session:', error)
    }
  }
}

// Smart Task Suggestions Service
export class TaskSuggestionsService {
  private provider: AIProviderType
  private apiKey: string

  constructor(provider: AIProviderType, apiKey: string) {
    this.provider = provider
    this.apiKey = apiKey
  }

  async generateSuggestions(
    tasks: Task[],
    context: any = {}
  ): Promise<AISuggestion[]> {
    const service = AIServiceFactory.createService(this.provider, this.apiKey)
    const model = getDefaultModel(this.provider)

    const prompt = this.buildSuggestionsPrompt(tasks, context)
    
    const input: AIInputData = {
      prompt,
      context: {
        current_tasks: tasks,
        ...context
      },
      parameters: {
        temperature: 0.6,
        max_tokens: 1200,
        response_format: 'json'
      }
    }

    try {
      const output = await service.generateCompletion(input, model)
      
      await this.logAISession({ tasks, context }, output, 'task_suggestion')

      return this.parseSuggestionsResponse(output.response)
    } catch (error) {
      throw new Error(`Task suggestions failed: ${error.message}`)
    }
  }

  private buildSuggestionsPrompt(tasks: Task[], context: any): string {
    const tasksData = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      energy_level: task.energy_level,
      estimated_duration: task.estimated_duration,
      labels: task.labels
    }))

    return `
You are TaskTimeFlow AI, an expert at analyzing tasks and providing intelligent suggestions for productivity improvement.

## Current Tasks:
${JSON.stringify(tasksData, null, 2)}

## Additional Context:
${JSON.stringify(context, null, 2)}

## Analysis Areas:
1. Task prioritization and reordering
2. Time estimation accuracy
3. Energy level alignment
4. Batch processing opportunities
5. Missing dependencies or prerequisites
6. Label and categorization improvements
7. Context optimization
8. Deadline management

## Response Format (JSON):
{
  "suggestions": [
    {
      "id": "unique-suggestion-id",
      "type": "priority_change|time_adjustment|label_addition|etc",
      "title": "Short suggestion title",
      "description": "Detailed explanation of the suggestion",
      "confidence": 85,
      "reasoning": "Why this suggestion would be beneficial",
      "action_data": {
        "task_id": "task-id",
        "changes": {
          "priority": "high",
          "labels": ["urgent", "review"]
        }
      },
      "estimated_impact": {
        "productivity_improvement": 15,
        "time_saved": 30,
        "stress_reduction": 2
      },
      "requires_user_input": false
    }
  ]
}

Provide 3-5 actionable suggestions that would meaningfully improve the user's task management and productivity.
    `.trim()
  }

  private parseSuggestionsResponse(response: string): AISuggestion[] {
    try {
      const parsed = JSON.parse(response)
      return parsed.suggestions || []
    } catch (error) {
      throw new Error('Failed to parse suggestions response')
    }
  }

  private async logAISession(request: any, output: any, sessionType: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('ai_sessions').insert({
        user_id: user.id,
        provider: this.provider,
        session_type: sessionType,
        input_data: { prompt: 'Task suggestions request', context: request },
        output_data: output,
        status: 'completed'
      })
    } catch (error) {
      console.error('Failed to log AI session:', error)
    }
  }
}

// Helper functions
export async function getUserAIPreferences(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('ai_preferences')
    .eq('id', userId)
    .single()

  if (error) throw error

  return data.ai_preferences || {
    preferred_provider: 'openai',
    auto_suggestions: true,
    learning_mode: true
  }
}

export async function updateUserAIPreferences(userId: string, preferences: any) {
  const { error } = await supabase
    .from('users')
    .update({ ai_preferences: preferences })
    .eq('id', userId)

  if (error) throw error
}

export function createAIService(type: 'breakdown' | 'estimation' | 'optimization' | 'suggestions', provider: AIProviderType, apiKey: string) {
  switch (type) {
    case 'breakdown':
      return new TaskBreakdownService(provider, apiKey)
    case 'estimation':
      return new TimeEstimationService(provider, apiKey)
    case 'optimization':
      return new ScheduleOptimizationService(provider, apiKey)
    case 'suggestions':
      return new TaskSuggestionsService(provider, apiKey)
    default:
      throw new Error(`Unknown AI service type: ${type}`)
  }
}