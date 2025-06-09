-- TaskTimeFlow Initial Database Schema
-- Created: 2024-06-08
-- Version: 1.0.0

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('free', 'personal', 'pro', 'team', 'business', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'past_due', 'trial');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'guest');
CREATE TYPE task_priority AS ENUM ('urgent', 'high', 'medium', 'low');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'completed', 'cancelled');
CREATE TYPE energy_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE timeline_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE integration_provider AS ENUM ('google_calendar', 'google_tasks', 'slack', 'notion');
CREATE TYPE ai_provider AS ENUM ('openai', 'claude', 'gemini');

-- ===========================
-- Users and Organizations
-- ===========================

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'Asia/Tokyo',
  language TEXT DEFAULT 'ja',
  subscription_tier subscription_tier DEFAULT 'free',
  subscription_status subscription_status DEFAULT 'active',
  subscription_expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- Profile settings
  notification_preferences JSONB DEFAULT '{
    "desktop": true,
    "sound": true,
    "email_digest": "daily"
  }',
  
  -- AI settings
  ai_preferences JSONB DEFAULT '{
    "preferred_provider": "openai",
    "auto_suggestions": true,
    "api_keys_encrypted": {}
  }'
);

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_tier subscription_tier DEFAULT 'team',
  max_members INTEGER DEFAULT 5,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members table
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'member',
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

-- ===========================
-- Projects and Tasks
-- ===========================

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366F1',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  
  -- Kanban settings
  kanban_columns JSONB DEFAULT '[
    {"id": "todo", "name": "ToDo", "icon": "📝", "order": 0},
    {"id": "in_progress", "name": "進行中", "icon": "🚀", "order": 1},
    {"id": "review", "name": "レビュー", "icon": "👀", "order": 2},
    {"id": "completed", "name": "完了", "icon": "✅", "order": 3}
  ]',
  
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic information
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'todo',
  priority task_priority DEFAULT 'medium',
  
  -- Time management
  estimated_duration INTEGER, -- minutes
  actual_duration INTEGER, -- minutes
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  
  -- Metadata
  labels TEXT[] DEFAULT '{}',
  context TEXT, -- 'pc_required', 'anywhere', 'home_only' etc.
  energy_level energy_level,
  
  -- AI related
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_suggestions JSONB DEFAULT '{}',
  
  -- Drag & drop order
  position INTEGER DEFAULT 0,
  
  -- Pomodoro
  pomodoro_sessions JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ===========================
-- Timeline Management
-- ===========================

-- Timeline slots table
CREATE TABLE timeline_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Time settings
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  date DATE GENERATED ALWAYS AS (start_time::date) STORED,
  
  -- Slot status
  status timeline_status DEFAULT 'scheduled',
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  
  -- Sync information
  google_calendar_event_id TEXT,
  synced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent time overlaps
  EXCLUDE USING GIST (
    user_id WITH =,
    tsrange(start_time, end_time) WITH &&
  )
);

-- Time blocks table
CREATE TABLE time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Time settings
  start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour INTEGER NOT NULL CHECK (end_hour >= 1 AND end_hour <= 24),
  
  -- Block settings
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366F1',
  energy_level energy_level NOT NULL,
  
  -- Day settings (0=Sunday, 6=Saturday)
  days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}', -- Weekdays default
  
  -- Metadata
  description TEXT,
  is_work_time BOOLEAN DEFAULT TRUE,
  is_break_time BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent time overlaps for same user and days
  EXCLUDE USING GIST (
    user_id WITH =,
    int4range(start_hour, end_hour) WITH &&
  ) WHERE (days_of_week && days_of_week)
);

-- ===========================
-- Settings and Integrations
-- ===========================

-- User settings table
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Timeline settings
  timeline_settings JSONB DEFAULT '{
    "time_format": "24",
    "week_start": 1,
    "default_task_duration": 30,
    "auto_schedule": true
  }',
  
  -- Notification settings
  notification_settings JSONB DEFAULT '{
    "desktop_notifications": true,
    "sound_notifications": true,
    "email_digest": "daily",
    "break_reminders": true,
    "task_reminders": true
  }',
  
  -- UI settings
  ui_settings JSONB DEFAULT '{
    "theme": "default",
    "glass_effect": true,
    "task_area_ratio": 50,
    "layout_swapped": false
  }',
  
  -- Productivity settings
  productivity_settings JSONB DEFAULT '{
    "pomodoro_duration": 25,
    "short_break": 5,
    "long_break": 15,
    "auto_start_breaks": false
  }',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations table
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  provider integration_provider NOT NULL,
  
  -- Authentication info (encrypted)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  
  -- Settings
  settings JSONB DEFAULT '{}',
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  sync_errors JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, provider)
);

-- ===========================
-- AI and Analytics
-- ===========================

-- AI sessions table
CREATE TABLE ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  provider ai_provider NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('task_split', 'suggestion', 'analysis', 'chat')),
  
  -- Request/Response
  input_data JSONB NOT NULL,
  output_data JSONB,
  
  -- Usage tracking
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Productivity analytics table
CREATE TABLE productivity_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  
  -- Task statistics
  tasks_planned INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_cancelled INTEGER DEFAULT 0,
  
  -- Time statistics
  total_planned_minutes INTEGER DEFAULT 0,
  total_actual_minutes INTEGER DEFAULT 0,
  focus_time_minutes INTEGER DEFAULT 0,
  break_time_minutes INTEGER DEFAULT 0,
  
  -- Productivity metrics
  completion_rate DECIMAL(5,2), -- percentage
  efficiency_score DECIMAL(5,2), -- planned vs actual time
  energy_utilization JSONB DEFAULT '{}', -- energy level usage
  
  -- Pomodoro statistics
  pomodoro_sessions INTEGER DEFAULT 0,
  pomodoro_completed INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- ===========================
-- Subscription Management
-- ===========================

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Plan information
  plan_type subscription_tier NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- Pricing information
  price_usd DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  
  -- Status
  status subscription_status DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- Security and Audit
-- ===========================

-- Login attempts table
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Geographic information
  country TEXT,
  city TEXT,
  
  -- Risk score
  risk_score INTEGER DEFAULT 0
);

-- Account locks table
CREATE TABLE account_locks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  locked_until TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IP allowlists table (for enterprise)
CREATE TABLE ip_allowlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ip_range CIDR NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- Indexes for Performance
-- ===========================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription ON users(subscription_tier, subscription_status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Organizations indexes
CREATE INDEX idx_organizations_owner ON organizations(owner_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Organization members indexes
CREATE INDEX idx_org_members_organization ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(organization_id, role);

-- Projects indexes
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_organization ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);

-- Tasks indexes
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_created_by ON tasks(created_by_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_timeline ON tasks(start_time, end_time) WHERE start_time IS NOT NULL;
CREATE INDEX idx_tasks_labels ON tasks USING GIN (labels);
CREATE INDEX idx_tasks_position ON tasks(project_id, status, position);

-- Timeline slots indexes
CREATE INDEX idx_timeline_slots_user_date ON timeline_slots(user_id, date);
CREATE INDEX idx_timeline_slots_time_range ON timeline_slots USING GIST (tsrange(start_time, end_time));
CREATE INDEX idx_timeline_slots_status ON timeline_slots(user_id, status);

-- Time blocks indexes
CREATE INDEX idx_time_blocks_user ON time_blocks(user_id);
CREATE INDEX idx_time_blocks_energy ON time_blocks(energy_level);

-- AI sessions indexes
CREATE INDEX idx_ai_sessions_user_date ON ai_sessions(user_id, created_at::date);
CREATE INDEX idx_ai_sessions_provider ON ai_sessions(provider, created_at);
CREATE INDEX idx_ai_sessions_cost ON ai_sessions(user_id, cost_usd) WHERE cost_usd IS NOT NULL;

-- Analytics indexes
CREATE INDEX idx_analytics_user_date ON productivity_analytics(user_id, date);
CREATE INDEX idx_analytics_date ON productivity_analytics(date);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Login attempts indexes
CREATE INDEX idx_login_attempts_email ON login_attempts(email, attempted_at);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, attempted_at);

-- ===========================
-- Enable Row Level Security
-- ===========================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_allowlists ENABLE ROW LEVEL SECURITY;