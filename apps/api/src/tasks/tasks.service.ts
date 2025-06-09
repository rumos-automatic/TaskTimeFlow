import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TasksService {
  constructor(private supabaseService: SupabaseService) {}

  async getBulkTaskAnalytics(userId: string, taskIds: string[]) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        estimated_duration,
        actual_duration,
        created_at,
        updated_at,
        project_id,
        projects (
          id,
          name,
          color
        )
      `)
      .eq('created_by', userId)
      .in('id', taskIds);

    if (error) {
      throw new Error(`Failed to fetch task analytics: ${error.message}`);
    }

    return data;
  }

  async getTaskDependencies(userId: string, taskId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('task_dependencies')
      .select(`
        *,
        dependency_task:tasks!task_dependencies_dependency_id_fkey (
          id,
          title,
          status,
          priority
        ),
        dependent_task:tasks!task_dependencies_task_id_fkey (
          id,
          title,
          status,
          priority
        )
      `)
      .or(`task_id.eq.${taskId},dependency_id.eq.${taskId}`)
      .eq('created_by', userId);

    if (error) {
      throw new Error(`Failed to fetch task dependencies: ${error.message}`);
    }

    return data;
  }

  async createTaskDependency(userId: string, taskId: string, dependencyId: string) {
    // Check if tasks exist and belong to user
    const { data: tasks, error: tasksError } = await this.supabaseService
      .getClient()
      .from('tasks')
      .select('id')
      .eq('created_by', userId)
      .in('id', [taskId, dependencyId]);

    if (tasksError || tasks.length !== 2) {
      throw new NotFoundException('One or both tasks not found');
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('task_dependencies')
      .insert({
        task_id: taskId,
        dependency_id: dependencyId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task dependency: ${error.message}`);
    }

    return data;
  }

  async updateTaskProgress(userId: string, taskId: string, progress: number) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('tasks')
      .update({ 
        progress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('created_by', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update task progress: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Task not found');
    }

    return data;
  }

  async getTaskHistory(userId: string, taskId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('task_history')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch task history: ${error.message}`);
    }

    return data;
  }
}