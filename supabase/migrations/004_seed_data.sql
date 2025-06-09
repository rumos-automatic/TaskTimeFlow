-- TaskTimeFlow Initial Seed Data
-- Created: 2024-06-08
-- Version: 1.0.0

-- ===========================
-- Default System Data
-- ===========================

-- Insert demo organizations (for testing purposes)
INSERT INTO organizations (id, name, slug, description, subscription_tier, max_members) VALUES
(
  'demo-org-1',
  'TaskTimeFlow Demo Organization',
  'tasktimeflow-demo',
  'デモ用の組織です。TaskTimeFlowの機能をお試しいただけます。',
  'team',
  10
),
(
  'demo-org-2', 
  'Acme Corporation',
  'acme-corp',
  'Sample enterprise organization for testing enterprise features.',
  'enterprise',
  100
);

-- Insert demo projects
INSERT INTO projects (id, organization_id, name, description, color, kanban_columns) VALUES
(
  'demo-project-1',
  'demo-org-1',
  'ウェブサイトリニューアル',
  'コーポレートサイトの全面リニューアルプロジェクト',
  '#6366F1',
  '[
    {"id": "todo", "name": "未着手", "icon": "📝", "order": 0},
    {"id": "in_progress", "name": "進行中", "icon": "🚀", "order": 1},
    {"id": "review", "name": "レビュー", "icon": "👀", "order": 2},
    {"id": "completed", "name": "完了", "icon": "✅", "order": 3}
  ]'
),
(
  'demo-project-2',
  'demo-org-1', 
  'モバイルアプリ開発',
  'iOS/Android対応のタスク管理アプリ開発',
  '#10B981',
  '[
    {"id": "backlog", "name": "バックログ", "icon": "📋", "order": 0},
    {"id": "todo", "name": "ToDo", "icon": "📝", "order": 1},
    {"id": "doing", "name": "実装中", "icon": "⚡", "order": 2},
    {"id": "testing", "name": "テスト", "icon": "🧪", "order": 3},
    {"id": "done", "name": "完了", "icon": "🎉", "order": 4}
  ]'
),
(
  'demo-project-3',
  'demo-org-2',
  'Enterprise Dashboard',
  'Real-time analytics dashboard for enterprise customers',
  '#8B5CF6',
  '[
    {"id": "planning", "name": "Planning", "icon": "📋", "order": 0},
    {"id": "development", "name": "Development", "icon": "💻", "order": 1},
    {"id": "qa", "name": "QA Testing", "icon": "🔍", "order": 2},
    {"id": "staging", "name": "Staging", "icon": "🚀", "order": 3},
    {"id": "production", "name": "Production", "icon": "✅", "order": 4}
  ]'
);

-- Insert demo tasks
INSERT INTO tasks (id, project_id, title, description, status, priority, estimated_duration, labels, context, energy_level, position) VALUES
-- ウェブサイトリニューアル tasks
(
  'demo-task-1',
  'demo-project-1',
  'デザインシステム設計',
  'コンポーネントライブラリとデザインガイドラインの作成',
  'todo',
  'high',
  240,
  ARRAY['design', 'foundation'],
  'pc_required',
  'high',
  0
),
(
  'demo-task-2', 
  'demo-project-1',
  'トップページ実装',
  'レスポンシブ対応のトップページをNext.jsで実装',
  'in_progress',
  'high',
  480,
  ARRAY['frontend', 'nextjs'],
  'pc_required',
  'high',
  1
),
(
  'demo-task-3',
  'demo-project-1',
  'SEO設定',
  'メタタグ、サイトマップ、構造化データの実装',
  'todo',
  'medium',
  120,
  ARRAY['seo', 'marketing'],
  'pc_required',
  'medium',
  2
),

-- モバイルアプリ開発 tasks
(
  'demo-task-4',
  'demo-project-2',
  'プロトタイプ作成',
  'Figmaでモバイルアプリのプロトタイプを作成',
  'completed',
  'high',
  360,
  ARRAY['design', 'prototype'],
  'pc_required',
  'medium',
  0
),
(
  'demo-task-5',
  'demo-project-2',
  'React Native環境構築',
  '開発環境のセットアップとCI/CD設定',
  'in_progress',
  'medium',
  180,
  ARRAY['setup', 'devops'],
  'pc_required',
  'low',
  1
),

-- Enterprise Dashboard tasks
(
  'demo-task-6',
  'demo-project-3',
  'Requirements Analysis',
  'Gather and analyze enterprise dashboard requirements',
  'completed',
  'high',
  480,
  ARRAY['analysis', 'requirements'],
  'anywhere',
  'high',
  0
),
(
  'demo-task-7',
  'demo-project-3',
  'Database Schema Design',
  'Design scalable database schema for analytics data',
  'in_progress',
  'high',
  360,
  ARRAY['database', 'architecture'],
  'pc_required',
  'high',
  1
);

-- ===========================
-- Default Subscription Plans Data
-- ===========================

-- Note: Actual subscription records will be created by Stripe webhooks
-- This is just reference data for the application

-- ===========================
-- System Configuration Data
-- ===========================

-- Default AI provider configurations
-- These will be used by the application for API limits and features

-- Default integration provider settings
-- These define available integrations and their capabilities

-- ===========================
-- Default Time Block Templates
-- ===========================

-- These are inserted automatically by triggers when users are created
-- No need to insert here as the trigger handles it

-- ===========================
-- Sample Analytics Data
-- ===========================

-- Insert sample analytics data for demo purposes
-- This helps new users understand what analytics look like

INSERT INTO productivity_analytics (
  id, user_id, date,
  tasks_planned, tasks_completed, tasks_cancelled,
  total_planned_minutes, total_actual_minutes, focus_time_minutes,
  completion_rate, efficiency_score,
  pomodoro_sessions, pomodoro_completed
) VALUES
-- Sample data for demo user (will be replaced with real data)
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- Placeholder user ID
  CURRENT_DATE - INTERVAL '1 day',
  8, 6, 1,
  480, 420, 380,
  75.00, 114.29,
  15, 13
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- Placeholder user ID
  CURRENT_DATE - INTERVAL '2 days',
  6, 5, 0,
  360, 345, 320,
  83.33, 104.35,
  12, 11
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- Placeholder user ID
  CURRENT_DATE - INTERVAL '3 days',
  10, 8, 1,
  600, 550, 480,
  80.00, 109.09,
  18, 16
);

-- ===========================
-- Feature Flags and System Settings
-- ===========================

-- Create a system settings table for global configuration
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
(
  'ai_providers',
  '{
    "openai": {
      "name": "OpenAI GPT",
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "features": ["task_split", "suggestion", "analysis", "chat"],
      "pricing": {
        "gpt-4": {"input": 0.03, "output": 0.06},
        "gpt-3.5-turbo": {"input": 0.001, "output": 0.002}
      }
    },
    "claude": {
      "name": "Anthropic Claude",
      "models": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
      "features": ["task_split", "suggestion", "analysis", "chat"],
      "pricing": {
        "claude-3-opus": {"input": 0.015, "output": 0.075},
        "claude-3-sonnet": {"input": 0.003, "output": 0.015},
        "claude-3-haiku": {"input": 0.00025, "output": 0.00125}
      }
    },
    "gemini": {
      "name": "Google Gemini",
      "models": ["gemini-pro", "gemini-pro-vision"],
      "features": ["task_split", "suggestion", "analysis"],
      "pricing": {
        "gemini-pro": {"input": 0.001, "output": 0.002}
      }
    }
  }',
  'Available AI providers and their configurations'
),
(
  'integration_providers',
  '{
    "google_calendar": {
      "name": "Google Calendar",
      "features": ["sync_events", "create_events", "two_way_sync"],
      "required_scopes": ["calendar.readonly", "calendar.events"],
      "webhook_support": true
    },
    "google_tasks": {
      "name": "Google Tasks",
      "features": ["sync_tasks", "create_tasks", "two_way_sync"],
      "required_scopes": ["tasks.readonly", "tasks"],
      "webhook_support": false
    },
    "slack": {
      "name": "Slack",
      "features": ["notifications", "status_updates", "bot_commands"],
      "required_scopes": ["chat:write", "users:read"],
      "webhook_support": true
    },
    "notion": {
      "name": "Notion",
      "features": ["sync_pages", "create_tasks", "database_sync"],
      "required_scopes": ["read", "write"],
      "webhook_support": true
    }
  }',
  'Available integration providers and their capabilities'
),
(
  'subscription_limits',
  '{
    "free": {
      "projects": 3,
      "tasks_per_day": 20,
      "ai_requests_per_day": 5,
      "integrations": 1,
      "storage_mb": 100,
      "team_members": 1
    },
    "personal": {
      "projects": 10,
      "tasks_per_day": 100,
      "ai_requests_per_day": 50,
      "integrations": 3,
      "storage_mb": 1000,
      "team_members": 1
    },
    "pro": {
      "projects": 50,
      "tasks_per_day": 500,
      "ai_requests_per_day": 200,
      "integrations": 10,
      "storage_mb": 5000,
      "team_members": 1
    },
    "team": {
      "projects": 100,
      "tasks_per_day": 1000,
      "ai_requests_per_day": 500,
      "integrations": "unlimited",
      "storage_mb": 10000,
      "team_members": 10
    },
    "business": {
      "projects": 500,
      "tasks_per_day": 5000,
      "ai_requests_per_day": 2000,
      "integrations": "unlimited",
      "storage_mb": 50000,
      "team_members": 50
    },
    "enterprise": {
      "projects": "unlimited",
      "tasks_per_day": "unlimited",
      "ai_requests_per_day": "unlimited",
      "integrations": "unlimited",
      "storage_mb": "unlimited",
      "team_members": "unlimited"
    }
  }',
  'Subscription tier limits and features'
),
(
  'app_features',
  '{
    "ai_features": true,
    "google_integration": true,
    "team_features": true,
    "analytics": true,
    "real_time_collaboration": true,
    "mobile_app": false,
    "api_access": true,
    "webhooks": true,
    "sso": true,
    "audit_logs": true
  }',
  'Global feature flags for the application'
),
(
  'app_version',
  '{
    "version": "1.0.0",
    "build": "20240608001",
    "release_date": "2024-06-08",
    "changelog": "Initial release with core task management and timeline features"
  }',
  'Current application version information'
);

-- ===========================
-- Enable Row Level Security on System Settings
-- ===========================

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only service role can modify system settings
CREATE POLICY "Service role can manage system settings" ON system_settings
  FOR ALL TO service_role USING (true);

-- Everyone can read system settings (they contain public configuration)
CREATE POLICY "Anyone can read system settings" ON system_settings
  FOR SELECT USING (true);

-- ===========================
-- Sample Dashboard Widgets Configuration
-- ===========================

-- Insert default dashboard widget configurations
-- These will be used to populate new user dashboards

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config JSONB NOT NULL,
  default_position JSONB NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO dashboard_widgets (name, type, config, default_position, description, is_default) VALUES
(
  'Today''s Tasks',
  'task_list',
  '{
    "filter": "today",
    "show_completed": true,
    "max_items": 10,
    "compact_view": false
  }',
  '{"x": 0, "y": 0, "w": 6, "h": 4}',
  '今日のタスク一覧',
  true
),
(
  'Timeline Overview',
  'timeline',
  '{
    "time_range": "today",
    "show_energy_levels": true,
    "compact_view": true
  }',
  '{"x": 6, "y": 0, "w": 6, "h": 4}',
  'タイムライン概要',
  true
),
(
  'Weekly Analytics',
  'analytics_chart',
  '{
    "chart_type": "completion_rate",
    "time_range": "week",
    "show_trend": true
  }',
  '{"x": 0, "y": 4, "w": 4, "h": 3}',
  '週間分析チャート',
  true
),
(
  'Focus Time Tracker',
  'focus_timer',
  '{
    "timer_type": "pomodoro",
    "auto_start_breaks": false,
    "sound_notifications": true
  }',
  '{"x": 4, "y": 4, "w": 4, "h": 3}',
  '集中時間トラッカー',
  true
),
(
  'Quick Stats',
  'stats_overview',
  '{
    "metrics": ["tasks_completed", "focus_time", "completion_rate"],
    "time_range": "today"
  }',
  '{"x": 8, "y": 4, "w": 4, "h": 3}',
  'クイック統計',
  true
);

-- Enable RLS on dashboard widgets
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- Everyone can read default dashboard widgets
CREATE POLICY "Anyone can read default widgets" ON dashboard_widgets
  FOR SELECT USING (is_default = true);

-- Service role can manage all widgets
CREATE POLICY "Service role can manage widgets" ON dashboard_widgets
  FOR ALL TO service_role USING (true);

-- ===========================
-- Notification Templates
-- ===========================

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO notification_templates (name, type, subject, content, variables) VALUES
(
  'task_reminder',
  'desktop',
  'タスクリマインダー',
  'タスク「{{task_title}}」の開始時刻です。\n予定時間: {{estimated_duration}}分',
  '["task_title", "estimated_duration"]'
),
(
  'break_reminder', 
  'desktop',
  '休憩時間のお知らせ',
  '休憩時間です。{{break_duration}}分間リフレッシュしましょう。',
  '["break_duration"]'
),
(
  'daily_summary',
  'email',
  '本日の作業サマリー - TaskTimeFlow',
  '本日お疲れ様でした！\n\n完了タスク: {{completed_tasks}}件\n作業時間: {{focus_time}}分\n達成率: {{completion_rate}}%\n\n明日も頑張りましょう！',
  '["completed_tasks", "focus_time", "completion_rate"]'
),
(
  'weekly_report',
  'email', 
  '週間レポート - TaskTimeFlow',
  '今週の作業レポートをお送りします。\n\n総完了タスク: {{weekly_completed}}件\n総作業時間: {{weekly_focus_time}}時間\n平均達成率: {{avg_completion_rate}}%\n\n詳細はダッシュボードでご確認ください。',
  '["weekly_completed", "weekly_focus_time", "avg_completion_rate"]'
);

-- Enable RLS on notification templates
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can read system notification templates
CREATE POLICY "Anyone can read system templates" ON notification_templates
  FOR SELECT USING (is_system = true);

-- Service role can manage all templates
CREATE POLICY "Service role can manage templates" ON notification_templates
  FOR ALL TO service_role USING (true);