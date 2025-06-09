# TaskTimeFlow データベーススキーマ設計書

## 1. 概要

TaskTimeFlowは**Supabase（PostgreSQL）**を使用したデータベース設計を採用します。
Row Level Security（RLS）を活用してマルチテナント対応とセキュリティを確保します。

## 2. テーブル設計

### 2.1 ユーザー・組織管理

#### `users` - ユーザー情報
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'Asia/Tokyo',
  language TEXT DEFAULT 'ja',
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'personal', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
  subscription_expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- プロフィール設定
  notification_preferences JSONB DEFAULT '{
    "desktop": true,
    "sound": true,
    "email_digest": "daily"
  }',
  
  -- AI設定
  ai_preferences JSONB DEFAULT '{
    "preferred_provider": "openai",
    "auto_suggestions": true,
    "api_keys_encrypted": {}
  }'
);

-- RLS有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

#### `organizations` - 組織・チーム
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_tier TEXT DEFAULT 'team' CHECK (subscription_tier IN ('team', 'business', 'enterprise')),
  max_members INTEGER DEFAULT 5,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 組織メンバーシップ
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'guest')),
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
```

### 2.2 プロジェクト・タスク管理

#### `projects` - プロジェクト
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366F1',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  
  -- かんばん設定
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

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
```

#### `tasks` - タスク
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 基本情報
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  
  -- 時間管理
  estimated_duration INTEGER, -- 分単位
  actual_duration INTEGER, -- 分単位
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  
  -- メタデータ
  labels TEXT[] DEFAULT '{}',
  context TEXT, -- 'pc_required', 'anywhere', 'home_only' etc.
  energy_level TEXT CHECK (energy_level IN ('high', 'medium', 'low')),
  
  -- AI関連
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_suggestions JSONB DEFAULT '{}',
  
  -- ドラッグ&ドロップ用順序
  position INTEGER DEFAULT 0,
  
  -- ポモドーロ
  pomodoro_sessions JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- インデックス
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_timeline ON tasks(start_time, end_time) WHERE start_time IS NOT NULL;
```

### 2.3 タイムライン管理

#### `timeline_slots` - タイムラインスロット
```sql
CREATE TABLE timeline_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- 時間設定
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  date DATE GENERATED ALWAYS AS (start_time::date) STORED,
  
  -- スロット状態
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  
  -- 同期情報
  google_calendar_event_id TEXT,
  synced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 時間重複防止制約
  EXCLUDE USING GIST (
    user_id WITH =,
    tsrange(start_time, end_time) WITH &&
  )
);

ALTER TABLE timeline_slots ENABLE ROW LEVEL SECURITY;

-- インデックス
CREATE INDEX idx_timeline_slots_user_date ON timeline_slots(user_id, date);
CREATE INDEX idx_timeline_slots_time_range ON timeline_slots USING GIST (tsrange(start_time, end_time));
```

#### `time_blocks` - 時間ブロック設定
```sql
CREATE TABLE time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 時間設定
  start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour INTEGER NOT NULL CHECK (end_hour >= 1 AND end_hour <= 24),
  
  -- ブロック設定
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366F1',
  energy_level TEXT NOT NULL CHECK (energy_level IN ('high', 'medium', 'low')),
  
  -- 曜日設定（0=日曜, 6=土曜）
  days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}', -- 平日デフォルト
  
  -- メタデータ
  description TEXT,
  is_work_time BOOLEAN DEFAULT TRUE,
  is_break_time BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 時間重複防止制約
  EXCLUDE USING GIST (
    user_id WITH =,
    int4range(start_hour, end_hour) WITH &&
  ) WHERE (days_of_week && days_of_week)
);

ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;
```

### 2.4 設定・統合

#### `user_settings` - ユーザー設定
```sql
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- タイムライン設定
  timeline_settings JSONB DEFAULT '{
    "time_format": "24",
    "week_start": 1,
    "default_task_duration": 30,
    "auto_schedule": true
  }',
  
  -- 通知設定
  notification_settings JSONB DEFAULT '{
    "desktop_notifications": true,
    "sound_notifications": true,
    "email_digest": "daily",
    "break_reminders": true,
    "task_reminders": true
  }',
  
  -- UI設定
  ui_settings JSONB DEFAULT '{
    "theme": "default",
    "glass_effect": true,
    "task_area_ratio": 50,
    "layout_swapped": false
  }',
  
  -- 生産性設定
  productivity_settings JSONB DEFAULT '{
    "pomodoro_duration": 25,
    "short_break": 5,
    "long_break": 15,
    "auto_start_breaks": false
  }',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
```

#### `integrations` - 外部連携
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'google_tasks', 'slack', 'notion')),
  
  -- 認証情報（暗号化）
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  
  -- 設定
  settings JSONB DEFAULT '{}',
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  sync_errors JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, provider)
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
```

### 2.5 AI・分析

#### `ai_sessions` - AI利用履歴
```sql
CREATE TABLE ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'claude', 'gemini')),
  session_type TEXT NOT NULL CHECK (session_type IN ('task_split', 'suggestion', 'analysis', 'chat')),
  
  -- リクエスト・レスポンス
  input_data JSONB NOT NULL,
  output_data JSONB,
  
  -- 使用量トラッキング
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  
  -- ステータス
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;

-- インデックス
CREATE INDEX idx_ai_sessions_user_date ON ai_sessions(user_id, created_at::date);
CREATE INDEX idx_ai_sessions_provider ON ai_sessions(provider, created_at);
```

#### `productivity_analytics` - 生産性分析
```sql
CREATE TABLE productivity_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  
  -- タスク統計
  tasks_planned INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_cancelled INTEGER DEFAULT 0,
  
  -- 時間統計
  total_planned_minutes INTEGER DEFAULT 0,
  total_actual_minutes INTEGER DEFAULT 0,
  focus_time_minutes INTEGER DEFAULT 0,
  break_time_minutes INTEGER DEFAULT 0,
  
  -- 生産性指標
  completion_rate DECIMAL(5,2), -- パーセンテージ
  efficiency_score DECIMAL(5,2), -- 予定時間 vs 実際時間
  energy_utilization JSONB DEFAULT '{}', -- エネルギーレベル別利用状況
  
  -- ポモドーロ統計
  pomodoro_sessions INTEGER DEFAULT 0,
  pomodoro_completed INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

ALTER TABLE productivity_analytics ENABLE ROW LEVEL SECURITY;
```

### 2.6 サブスクリプション

#### `subscriptions` - サブスクリプション
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- プラン情報
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'personal', 'pro', 'team', 'business', 'enterprise')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- 料金情報
  price_usd DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Stripe連携
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  
  -- ステータス
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due', 'trial')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
```

## 3. ビュー（View）

### 3.1 ダッシュボード用統計ビュー
```sql
CREATE VIEW user_dashboard_stats AS
SELECT 
  u.id as user_id,
  u.display_name,
  
  -- 今日の統計
  COALESCE(pa_today.tasks_completed, 0) as today_tasks_completed,
  COALESCE(pa_today.completion_rate, 0) as today_completion_rate,
  COALESCE(pa_today.focus_time_minutes, 0) as today_focus_minutes,
  
  -- 今週の統計
  COALESCE(pa_week.avg_completion_rate, 0) as week_avg_completion_rate,
  COALESCE(pa_week.total_focus_minutes, 0) as week_total_focus_minutes,
  
  -- アクティブタスク数
  COALESCE(active_tasks.count, 0) as active_tasks_count,
  
  -- 今日の予定
  COALESCE(today_schedule.count, 0) as today_scheduled_count

FROM users u

-- 今日の統計
LEFT JOIN productivity_analytics pa_today ON (
  u.id = pa_today.user_id AND 
  pa_today.date = CURRENT_DATE
)

-- 今週の統計
LEFT JOIN (
  SELECT 
    user_id,
    AVG(completion_rate) as avg_completion_rate,
    SUM(focus_time_minutes) as total_focus_minutes
  FROM productivity_analytics 
  WHERE date >= date_trunc('week', CURRENT_DATE)
  GROUP BY user_id
) pa_week ON u.id = pa_week.user_id

-- アクティブタスク
LEFT JOIN (
  SELECT assignee_id, COUNT(*) as count
  FROM tasks 
  WHERE status IN ('todo', 'in_progress') 
    AND assignee_id IS NOT NULL
  GROUP BY assignee_id
) active_tasks ON u.id = active_tasks.assignee_id

-- 今日の予定
LEFT JOIN (
  SELECT user_id, COUNT(*) as count
  FROM timeline_slots 
  WHERE date = CURRENT_DATE 
    AND status IN ('scheduled', 'in_progress')
  GROUP BY user_id
) today_schedule ON u.id = today_schedule.user_id;
```

## 4. RLS（Row Level Security）ポリシー

### 4.1 基本ポリシー
```sql
-- プロジェクトアクセス制御
CREATE POLICY "Users can access own projects" ON projects
  FOR ALL USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.organization_id = projects.organization_id 
        AND om.user_id = auth.uid()
    )
  );

-- タスクアクセス制御
CREATE POLICY "Users can access project tasks" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = tasks.project_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM organization_members om 
          WHERE om.organization_id = p.organization_id 
            AND om.user_id = auth.uid()
        )
      )
    )
  );

-- タイムラインアクセス制御
CREATE POLICY "Users can access own timeline" ON timeline_slots
  FOR ALL USING (user_id = auth.uid());

-- 設定アクセス制御
CREATE POLICY "Users can access own settings" ON user_settings
  FOR ALL USING (user_id = auth.uid());
```

## 5. インデックス戦略

### 5.1 パフォーマンス最適化インデックス
```sql
-- 複合インデックス
CREATE INDEX idx_tasks_project_assignee_status ON tasks(project_id, assignee_id, status);
CREATE INDEX idx_timeline_user_date_status ON timeline_slots(user_id, date, status);
CREATE INDEX idx_ai_sessions_cost_tracking ON ai_sessions(user_id, created_at, tokens_used);

-- 部分インデックス
CREATE INDEX idx_active_tasks ON tasks(assignee_id, updated_at) 
  WHERE status IN ('todo', 'in_progress');

CREATE INDEX idx_today_timeline ON timeline_slots(user_id, start_time) 
  WHERE date = CURRENT_DATE;

-- JSONB インデックス
CREATE INDEX idx_user_ai_preferences ON users USING GIN (ai_preferences);
CREATE INDEX idx_task_labels ON tasks USING GIN (labels);
```

## 6. データ移行・初期化

### 6.1 初期データ挿入
```sql
-- デフォルト時間ブロック作成関数
CREATE OR REPLACE FUNCTION create_default_time_blocks(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO time_blocks (user_id, start_hour, end_hour, label, color, energy_level, days_of_week)
  VALUES 
    (p_user_id, 0, 6, '睡眠時間', '#374151', 'low', '{0,1,2,3,4,5,6}'),
    (p_user_id, 6, 8, '早朝準備', '#3B82F6', 'medium', '{1,2,3,4,5}'),
    (p_user_id, 8, 12, '午前（高エネルギー）', '#10B981', 'high', '{1,2,3,4,5}'),
    (p_user_id, 12, 14, '昼休み', '#F59E0B', 'low', '{1,2,3,4,5}'),
    (p_user_id, 14, 18, '午後（中エネルギー）', '#6366F1', 'medium', '{1,2,3,4,5}'),
    (p_user_id, 18, 22, '夕方（低エネルギー）', '#8B5CF6', 'low', '{1,2,3,4,5}'),
    (p_user_id, 22, 24, '就寝準備', '#6B7280', 'low', '{0,1,2,3,4,5,6}');
END;
$$ LANGUAGE plpgsql;

-- 新規ユーザー設定作成関数
CREATE OR REPLACE FUNCTION create_user_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- ユーザー設定を作成
  INSERT INTO user_settings (user_id) VALUES (NEW.id);
  
  -- デフォルト時間ブロックを作成
  PERFORM create_default_time_blocks(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー設定
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_defaults();
```

このデータベーススキーマ設計により、TaskTimeFlowの全機能を支援する堅牢で拡張可能なデータ基盤が構築できます。