import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AnalyticsService {
  constructor(private supabaseService: SupabaseService) {}

  async getAdvancedProductivityMetrics(userId: string, startDate: string, endDate: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('get_advanced_productivity_metrics', {
        user_id: userId,
        start_date: startDate,
        end_date: endDate,
      });

    if (error) {
      throw new Error(`Failed to fetch productivity metrics: ${error.message}`);
    }

    return data;
  }

  async getPomodoroAnalytics(userId: string, period: 'week' | 'month' | 'year') {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('get_pomodoro_analytics', {
        user_id: userId,
        period_type: period,
      });

    if (error) {
      throw new Error(`Failed to fetch pomodoro analytics: ${error.message}`);
    }

    return data;
  }

  async getTimeDistributionAnalysis(userId: string, startDate: string, endDate: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('get_time_distribution_analysis', {
        user_id: userId,
        start_date: startDate,
        end_date: endDate,
      });

    if (error) {
      throw new Error(`Failed to fetch time distribution analysis: ${error.message}`);
    }

    return data;
  }

  async getProductivityPredictions(userId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('get_productivity_predictions', {
        user_id: userId,
      });

    if (error) {
      throw new Error(`Failed to fetch productivity predictions: ${error.message}`);
    }

    return data;
  }

  async generateCustomReport(userId: string, reportConfig: any) {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('generate_custom_report', {
        user_id: userId,
        config: reportConfig,
      });

    if (error) {
      throw new Error(`Failed to generate custom report: ${error.message}`);
    }

    return data;
  }

  async getTeamAnalytics(teamId: string, userId: string) {
    // Check if user has access to team
    const { data: teamMember, error: memberError } = await this.supabaseService
      .getClient()
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (memberError || !teamMember) {
      throw new Error('Access denied: User is not a member of this team');
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('get_team_analytics', {
        team_id: teamId,
      });

    if (error) {
      throw new Error(`Failed to fetch team analytics: ${error.message}`);
    }

    return data;
  }
}