import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AIService {
  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {}

  async processLargeTaskBatch(userId: string, tasks: any[], operation: string) {
    // Process large batches of tasks that exceed frontend capabilities
    const batchSize = 100;
    const results = [];

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      switch (operation) {
        case 'analyze_complexity':
          const complexityResults = await this.analyzeTaskComplexity(userId, batch);
          results.push(...complexityResults);
          break;
        
        case 'generate_subtasks':
          const subtaskResults = await this.generateSubtasks(userId, batch);
          results.push(...subtaskResults);
          break;
        
        case 'optimize_schedule':
          const scheduleResults = await this.optimizeSchedule(userId, batch);
          results.push(...scheduleResults);
          break;
        
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    }

    return results;
  }

  private async analyzeTaskComplexity(userId: string, tasks: any[]) {
    // AI-powered task complexity analysis
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prepare prompt for AI analysis
    const tasksDescription = tasks.map(task => 
      `ID: ${task.id}, Title: ${task.title}, Description: ${task.description || 'No description'}`
    ).join('\n');

    const prompt = `Analyze the complexity of these tasks and provide a complexity score (1-10) and reasoning for each:

${tasksDescription}

Return a JSON array with format: [{"id": "task_id", "complexity": 5, "reasoning": "explanation"}]`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a task management expert. Analyze task complexity based on scope, technical requirements, dependencies, and time requirements.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      const analysisResults = JSON.parse(data.choices[0].message.content);

      // Store results in database
      for (const result of analysisResults) {
        await this.supabaseService
          .getClient()
          .from('ai_task_analysis')
          .upsert({
            task_id: result.id,
            user_id: userId,
            complexity_score: result.complexity,
            complexity_reasoning: result.reasoning,
            analysis_type: 'complexity',
            created_at: new Date().toISOString(),
          });
      }

      return analysisResults;
    } catch (error) {
      console.error('AI analysis failed:', error);
      throw new Error('Failed to analyze task complexity');
    }
  }

  private async generateSubtasks(userId: string, tasks: any[]) {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const results = [];

    for (const task of tasks) {
      const prompt = `Break down this task into smaller, actionable subtasks:

Task: ${task.title}
Description: ${task.description || 'No description provided'}
Priority: ${task.priority}
Estimated Duration: ${task.estimated_duration} minutes

Generate 3-7 specific subtasks that would help complete this main task. Return a JSON array with format:
[{"title": "Subtask title", "description": "Detailed description", "estimatedDuration": 30}]`;

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are a productivity expert. Break down complex tasks into smaller, actionable steps.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.4,
          }),
        });

        const data = await response.json();
        const subtasks = JSON.parse(data.choices[0].message.content);

        // Create subtasks in database
        const createdSubtasks = [];
        for (const subtask of subtasks) {
          const { data: newSubtask, error } = await this.supabaseService
            .getClient()
            .from('tasks')
            .insert({
              title: subtask.title,
              description: subtask.description,
              parent_task_id: task.id,
              created_by: userId,
              project_id: task.project_id,
              priority: task.priority,
              estimated_duration: subtask.estimatedDuration,
              status: 'todo',
            })
            .select()
            .single();

          if (!error && newSubtask) {
            createdSubtasks.push(newSubtask);
          }
        }

        results.push({
          parentTaskId: task.id,
          subtasks: createdSubtasks,
        });
      } catch (error) {
        console.error(`Failed to generate subtasks for task ${task.id}:`, error);
      }
    }

    return results;
  }

  private async optimizeSchedule(userId: string, tasks: any[]) {
    // AI-powered schedule optimization
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get user's historical productivity data
    const { data: productivityData } = await this.supabaseService
      .getClient()
      .rpc('get_user_productivity_patterns', {
        user_id: userId,
      });

    const tasksForScheduling = tasks.map(task => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      estimatedDuration: task.estimated_duration,
      dependencies: task.dependencies || [],
    }));

    const prompt = `Optimize the schedule for these tasks based on productivity patterns:

Tasks: ${JSON.stringify(tasksForScheduling)}
User's productive hours: ${JSON.stringify(productivityData?.productive_hours || ['09:00-11:00', '14:00-16:00'])}
User's preferences: ${JSON.stringify(productivityData?.preferences || {})}

Create an optimized schedule that:
1. Places high-priority tasks during productive hours
2. Respects task dependencies
3. Balances workload throughout the day
4. Includes appropriate breaks

Return JSON format: [{"taskId": "task_id", "scheduledStart": "2024-01-15T09:00:00Z", "scheduledEnd": "2024-01-15T10:30:00Z", "reasoning": "explanation"}]`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a productivity and scheduling expert. Create optimal schedules based on task priorities, durations, and user productivity patterns.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.2,
        }),
      });

      const data = await response.json();
      const scheduleOptimization = JSON.parse(data.choices[0].message.content);

      // Store optimization results
      for (const optimization of scheduleOptimization) {
        await this.supabaseService
          .getClient()
          .from('ai_schedule_optimizations')
          .insert({
            task_id: optimization.taskId,
            user_id: userId,
            scheduled_start: optimization.scheduledStart,
            scheduled_end: optimization.scheduledEnd,
            reasoning: optimization.reasoning,
            created_at: new Date().toISOString(),
          });
      }

      return scheduleOptimization;
    } catch (error) {
      console.error('Schedule optimization failed:', error);
      throw new Error('Failed to optimize schedule');
    }
  }

  async getAIInsights(userId: string, timeframe: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('get_ai_insights', {
        user_id: userId,
        timeframe: timeframe,
      });

    if (error) {
      throw new Error(`Failed to fetch AI insights: ${error.message}`);
    }

    return data;
  }
}