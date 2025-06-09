-- Google integration tables

-- Store Google integration credentials and settings
CREATE TABLE integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'microsoft', etc.
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'paused', 'revoked', 'error'
    
    -- OAuth tokens
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- Provider specific data
    provider_user_id VARCHAR(255),
    provider_email VARCHAR(255),
    provider_data JSONB DEFAULT '{}',
    
    -- Settings
    sync_enabled BOOLEAN DEFAULT true,
    sync_calendar BOOLEAN DEFAULT true,
    sync_tasks BOOLEAN DEFAULT true,
    calendar_id VARCHAR(255) DEFAULT 'primary',
    task_list_id VARCHAR(255) DEFAULT '@default',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ,
    
    UNIQUE(user_id, provider)
);

-- Google sync mappings to prevent duplicates
CREATE TABLE google_sync_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tasktime_id VARCHAR(255) NOT NULL, -- Can be task_id or slot_id with prefix
    google_id VARCHAR(255) NOT NULL,
    sync_type VARCHAR(20) NOT NULL, -- 'calendar' or 'tasks'
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_metadata JSONB DEFAULT '{}',
    
    UNIQUE(user_id, tasktime_id, sync_type),
    UNIQUE(user_id, google_id, sync_type)
);

-- Google webhooks for push notifications
CREATE TABLE google_webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_id VARCHAR(255) NOT NULL,
    resource_uri TEXT NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    expiration TIMESTAMPTZ NOT NULL,
    calendar_id VARCHAR(255),
    webhook_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, channel_id)
);

-- Sync logs for debugging and history
CREATE TABLE sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'webhook'
    direction VARCHAR(20) NOT NULL, -- 'to_google', 'from_google', 'bidirectional'
    status VARCHAR(20) NOT NULL, -- 'started', 'completed', 'failed'
    
    -- Sync statistics
    items_created INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    items_deleted INTEGER DEFAULT 0,
    items_skipped INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Debug info
    sync_data JSONB DEFAULT '{}'
);

-- Conflict resolution history
CREATE TABLE sync_conflicts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tasktime_id VARCHAR(255) NOT NULL,
    google_id VARCHAR(255),
    conflict_type VARCHAR(50) NOT NULL, -- 'update_conflict', 'delete_conflict', 'duplicate'
    
    -- Conflict data
    tasktime_data JSONB,
    google_data JSONB,
    resolution VARCHAR(50), -- 'tasktime_wins', 'google_wins', 'merged', 'skipped'
    resolved_by VARCHAR(50), -- 'auto', 'user', 'admin'
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings extension for Google integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255) DEFAULT 'primary';
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_task_list_id VARCHAR(255) DEFAULT '@default';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sync_frequency VARCHAR(20) DEFAULT 'realtime'; -- 'realtime', 'hourly', 'daily', 'manual'
ALTER TABLE users ADD COLUMN IF NOT EXISTS conflict_resolution VARCHAR(20) DEFAULT 'ask'; -- 'ask', 'tasktime_wins', 'google_wins', 'newest_wins'

-- Indexes for performance
CREATE INDEX idx_integrations_user_provider ON integrations(user_id, provider);
CREATE INDEX idx_integrations_status ON integrations(status);
CREATE INDEX idx_sync_mappings_user ON google_sync_mappings(user_id);
CREATE INDEX idx_sync_mappings_tasktime ON google_sync_mappings(tasktime_id);
CREATE INDEX idx_sync_mappings_google ON google_sync_mappings(google_id);
CREATE INDEX idx_webhooks_expiration ON google_webhooks(expiration);
CREATE INDEX idx_sync_logs_user_time ON sync_logs(user_id, started_at DESC);
CREATE INDEX idx_sync_conflicts_user ON sync_conflicts(user_id, created_at DESC);

-- Row Level Security
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_sync_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own integrations" ON integrations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own integrations" ON integrations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sync mappings" ON google_sync_mappings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sync mappings" ON google_sync_mappings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own webhooks" ON google_webhooks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own webhooks" ON google_webhooks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sync logs" ON sync_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sync logs" ON sync_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own sync conflicts" ON sync_conflicts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sync conflicts" ON sync_conflicts
    FOR ALL USING (auth.uid() = user_id);

-- Functions for sync operations
CREATE OR REPLACE FUNCTION update_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_synced_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_integration_sync_timestamp
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION update_sync_timestamp();

CREATE TRIGGER update_mapping_sync_timestamp
    BEFORE UPDATE ON google_sync_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_timestamp();