export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          timezone: string
          language: string
          subscription_tier: Database['public']['Enums']['subscription_tier']
          subscription_status: Database['public']['Enums']['subscription_status']
          subscription_expires_at: string | null
          trial_ends_at: string | null
          created_at: string
          updated_at: string
          last_login_at: string | null
          notification_preferences: Json
          ai_preferences: Json
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          timezone?: string
          language?: string
          subscription_tier?: Database['public']['Enums']['subscription_tier']
          subscription_status?: Database['public']['Enums']['subscription_status']
          subscription_expires_at?: string | null
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
          notification_preferences?: Json
          ai_preferences?: Json
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          timezone?: string
          language?: string
          subscription_tier?: Database['public']['Enums']['subscription_tier']
          subscription_status?: Database['public']['Enums']['subscription_status']
          subscription_expires_at?: string | null
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
          notification_preferences?: Json
          ai_preferences?: Json
        }
        Relationships: []
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          avatar_url: string | null
          owner_id: string
          subscription_tier: Database['public']['Enums']['subscription_tier']
          max_members: number
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          avatar_url?: string | null
          owner_id: string
          subscription_tier?: Database['public']['Enums']['subscription_tier']
          max_members?: number
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          avatar_url?: string | null
          owner_id?: string
          subscription_tier?: Database['public']['Enums']['subscription_tier']
          max_members?: number
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: Database['public']['Enums']['user_role']
          permissions: Json
          joined_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: Database['public']['Enums']['user_role']
          permissions?: Json
          joined_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: Database['public']['Enums']['user_role']
          permissions?: Json
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          owner_id: string
          name: string
          description: string | null
          color: string
          status: string
          kanban_columns: Json
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          owner_id: string
          name: string
          description?: string | null
          color?: string
          status?: string
          kanban_columns?: Json
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          owner_id?: string
          name?: string
          description?: string | null
          color?: string
          status?: string
          kanban_columns?: Json
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          assignee_id: string | null
          created_by_id: string
          title: string
          description: string | null
          status: Database['public']['Enums']['task_status']
          priority: Database['public']['Enums']['task_priority']
          estimated_duration: number | null
          actual_duration: number | null
          start_time: string | null
          end_time: string | null
          labels: string[]
          context: string | null
          energy_level: Database['public']['Enums']['energy_level'] | null
          ai_generated: boolean
          ai_suggestions: Json
          position: number
          pomodoro_sessions: Json
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          assignee_id?: string | null
          created_by_id: string
          title: string
          description?: string | null
          status?: Database['public']['Enums']['task_status']
          priority?: Database['public']['Enums']['task_priority']
          estimated_duration?: number | null
          actual_duration?: number | null
          start_time?: string | null
          end_time?: string | null
          labels?: string[]
          context?: string | null
          energy_level?: Database['public']['Enums']['energy_level'] | null
          ai_generated?: boolean
          ai_suggestions?: Json
          position?: number
          pomodoro_sessions?: Json
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          assignee_id?: string | null
          created_by_id?: string
          title?: string
          description?: string | null
          status?: Database['public']['Enums']['task_status']
          priority?: Database['public']['Enums']['task_priority']
          estimated_duration?: number | null
          actual_duration?: number | null
          start_time?: string | null
          end_time?: string | null
          labels?: string[]
          context?: string | null
          energy_level?: Database['public']['Enums']['energy_level'] | null
          ai_generated?: boolean
          ai_suggestions?: Json
          position?: number
          pomodoro_sessions?: Json
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_id_fkey"
            columns: ["created_by_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      timeline_slots: {
        Row: {
          id: string
          user_id: string
          task_id: string
          start_time: string
          end_time: string
          date: string
          status: Database['public']['Enums']['timeline_status']
          actual_start_time: string | null
          actual_end_time: string | null
          google_calendar_event_id: string | null
          synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id: string
          start_time: string
          end_time: string
          status?: Database['public']['Enums']['timeline_status']
          actual_start_time?: string | null
          actual_end_time?: string | null
          google_calendar_event_id?: string | null
          synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string
          start_time?: string
          end_time?: string
          status?: Database['public']['Enums']['timeline_status']
          actual_start_time?: string | null
          actual_end_time?: string | null
          google_calendar_event_id?: string | null
          synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_slots_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_slots_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      time_blocks: {
        Row: {
          id: string
          user_id: string
          start_hour: number
          end_hour: number
          label: string
          color: string
          energy_level: Database['public']['Enums']['energy_level']
          days_of_week: number[]
          description: string | null
          is_work_time: boolean
          is_break_time: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_hour: number
          end_hour: number
          label: string
          color?: string
          energy_level: Database['public']['Enums']['energy_level']
          days_of_week?: number[]
          description?: string | null
          is_work_time?: boolean
          is_break_time?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_hour?: number
          end_hour?: number
          label?: string
          color?: string
          energy_level?: Database['public']['Enums']['energy_level']
          days_of_week?: number[]
          description?: string | null
          is_work_time?: boolean
          is_break_time?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_blocks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_settings: {
        Row: {
          user_id: string
          timeline_settings: Json
          notification_settings: Json
          ui_settings: Json
          productivity_settings: Json
          updated_at: string
        }
        Insert: {
          user_id: string
          timeline_settings?: Json
          notification_settings?: Json
          ui_settings?: Json
          productivity_settings?: Json
          updated_at?: string
        }
        Update: {
          user_id?: string
          timeline_settings?: Json
          notification_settings?: Json
          ui_settings?: Json
          productivity_settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      integrations: {
        Row: {
          id: string
          user_id: string
          provider: Database['public']['Enums']['integration_provider']
          access_token_encrypted: string | null
          refresh_token_encrypted: string | null
          expires_at: string | null
          settings: Json
          sync_enabled: boolean
          last_sync_at: string | null
          sync_errors: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: Database['public']['Enums']['integration_provider']
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          expires_at?: string | null
          settings?: Json
          sync_enabled?: boolean
          last_sync_at?: string | null
          sync_errors?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: Database['public']['Enums']['integration_provider']
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          expires_at?: string | null
          settings?: Json
          sync_enabled?: boolean
          last_sync_at?: string | null
          sync_errors?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_sessions: {
        Row: {
          id: string
          user_id: string
          provider: Database['public']['Enums']['ai_provider']
          session_type: string
          input_data: Json
          output_data: Json | null
          tokens_used: number | null
          cost_usd: number | null
          status: string
          error_message: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          provider: Database['public']['Enums']['ai_provider']
          session_type: string
          input_data: Json
          output_data?: Json | null
          tokens_used?: number | null
          cost_usd?: number | null
          status?: string
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          provider?: Database['public']['Enums']['ai_provider']
          session_type?: string
          input_data?: Json
          output_data?: Json | null
          tokens_used?: number | null
          cost_usd?: number | null
          status?: string
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      productivity_analytics: {
        Row: {
          id: string
          user_id: string
          date: string
          tasks_planned: number
          tasks_completed: number
          tasks_cancelled: number
          total_planned_minutes: number
          total_actual_minutes: number
          focus_time_minutes: number
          break_time_minutes: number
          completion_rate: number | null
          efficiency_score: number | null
          energy_utilization: Json
          pomodoro_sessions: number
          pomodoro_completed: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          tasks_planned?: number
          tasks_completed?: number
          tasks_cancelled?: number
          total_planned_minutes?: number
          total_actual_minutes?: number
          focus_time_minutes?: number
          break_time_minutes?: number
          completion_rate?: number | null
          efficiency_score?: number | null
          energy_utilization?: Json
          pomodoro_sessions?: number
          pomodoro_completed?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          tasks_planned?: number
          tasks_completed?: number
          tasks_cancelled?: number
          total_planned_minutes?: number
          total_actual_minutes?: number
          focus_time_minutes?: number
          break_time_minutes?: number
          completion_rate?: number | null
          efficiency_score?: number | null
          energy_utilization?: Json
          pomodoro_sessions?: number
          pomodoro_completed?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productivity_analytics_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          organization_id: string | null
          plan_type: Database['public']['Enums']['subscription_tier']
          billing_cycle: string
          price_usd: number
          currency: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          status: Database['public']['Enums']['subscription_status']
          current_period_start: string
          current_period_end: string
          trial_end: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id?: string | null
          plan_type: Database['public']['Enums']['subscription_tier']
          billing_cycle?: string
          price_usd: number
          currency?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: Database['public']['Enums']['subscription_status']
          current_period_start: string
          current_period_end: string
          trial_end?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string | null
          plan_type?: Database['public']['Enums']['subscription_tier']
          billing_cycle?: string
          price_usd?: number
          currency?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: Database['public']['Enums']['subscription_status']
          current_period_start?: string
          current_period_end?: string
          trial_end?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      login_attempts: {
        Row: {
          id: string
          email: string | null
          ip_address: string | null
          user_agent: string | null
          success: boolean
          attempted_at: string
          country: string | null
          city: string | null
          risk_score: number
        }
        Insert: {
          id?: string
          email?: string | null
          ip_address?: string | null
          user_agent?: string | null
          success?: boolean
          attempted_at?: string
          country?: string | null
          city?: string | null
          risk_score?: number
        }
        Update: {
          id?: string
          email?: string | null
          ip_address?: string | null
          user_agent?: string | null
          success?: boolean
          attempted_at?: string
          country?: string | null
          city?: string | null
          risk_score?: number
        }
        Relationships: []
      }
      account_locks: {
        Row: {
          user_id: string
          locked_until: string
          reason: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          locked_until: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          locked_until?: string
          reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_locks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type?: string | null
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          resource_type?: string | null
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ip_allowlists: {
        Row: {
          id: string
          organization_id: string
          ip_range: string
          description: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          ip_range: string
          description?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          ip_range?: string
          description?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_allowlists_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_allowlists_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      should_lock_account: {
        Args: {
          email_param: string
        }
        Returns: boolean
      }
      check_subscription_limit: {
        Args: {
          user_id_param: string
          resource_type: string
          current_count: number
        }
        Returns: boolean
      }
      get_user_subscription_tier: {
        Args: {
          user_id_param: string
        }
        Returns: Database['public']['Enums']['subscription_tier']
      }
      update_daily_analytics: {
        Args: {
          target_user_id: string
          target_date: string
        }
        Returns: void
      }
    }
    Enums: {
      subscription_tier: 'free' | 'personal' | 'pro' | 'team' | 'business' | 'enterprise'
      subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trial'
      user_role: 'owner' | 'admin' | 'member' | 'guest'
      task_priority: 'urgent' | 'high' | 'medium' | 'low'
      task_status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled'
      energy_level: 'high' | 'medium' | 'low'
      timeline_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
      integration_provider: 'google_calendar' | 'google_tasks' | 'slack' | 'notion'
      ai_provider: 'openai' | 'claude' | 'gemini'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}