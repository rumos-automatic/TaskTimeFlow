-- TaskTimeFlow Database Functions and Triggers
-- Created: 2024-06-08
-- Version: 1.0.0

-- ===========================
-- Utility Functions
-- ===========================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create user settings on user creation
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default time blocks for new users
CREATE OR REPLACE FUNCTION create_default_time_blocks()
RETURNS TRIGGER AS $$
BEGIN
    -- 深夜 (0-6時)
    INSERT INTO time_blocks (user_id, start_hour, end_hour, label, color, energy_level, description, is_work_time, is_break_time, days_of_week)
    VALUES (NEW.id, 0, 6, '深夜・睡眠', '#1e293b', 'low', '睡眠時間', false, true, '{0,1,2,3,4,5,6}');
    
    -- 朝 (6-8時)
    INSERT INTO time_blocks (user_id, start_hour, end_hour, label, color, energy_level, description, is_work_time, is_break_time, days_of_week)
    VALUES (NEW.id, 6, 8, '朝の準備', '#3b82f6', 'medium', '朝の準備・朝食', false, false, '{1,2,3,4,5}');
    
    -- 午前 (8-12時)
    INSERT INTO time_blocks (user_id, start_hour, end_hour, label, color, energy_level, description, is_work_time, is_break_time, days_of_week)
    VALUES (NEW.id, 8, 12, '午前の作業', '#10b981', 'high', '集中力が高い時間帯', true, false, '{1,2,3,4,5}');
    
    -- 昼食 (12-13時)
    INSERT INTO time_blocks (user_id, start_hour, end_hour, label, color, energy_level, description, is_work_time, is_break_time, days_of_week)
    VALUES (NEW.id, 12, 13, '昼食', '#f59e0b', 'medium', '昼食休憩', false, true, '{1,2,3,4,5}');
    
    -- 午後 (13-18時)
    INSERT INTO time_blocks (user_id, start_hour, end_hour, label, color, energy_level, description, is_work_time, is_break_time, days_of_week)
    VALUES (NEW.id, 13, 18, '午後の作業', '#8b5cf6', 'medium', '午後の業務時間', true, false, '{1,2,3,4,5}');
    
    -- 夕方 (18-22時)
    INSERT INTO time_blocks (user_id, start_hour, end_hour, label, color, energy_level, description, is_work_time, is_break_time, days_of_week)
    VALUES (NEW.id, 18, 22, '夕方・プライベート', '#ef4444', 'low', '夕食・リラックス時間', false, false, '{1,2,3,4,5}');
    
    -- 夜 (22-24時)
    INSERT INTO time_blocks (user_id, start_hour, end_hour, label, color, energy_level, description, is_work_time, is_break_time, days_of_week)
    VALUES (NEW.id, 22, 24, '夜・就寝準備', '#6366f1', 'low', '就寝準備', false, true, '{0,1,2,3,4,5,6}');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================
-- Audit Logging Functions
-- ===========================

-- Generic audit logging function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    user_id_val UUID;
    old_values_json JSONB;
    new_values_json JSONB;
BEGIN
    -- Get user ID from auth context
    user_id_val := auth.uid();
    
    -- Handle different operations
    IF TG_OP = 'DELETE' THEN
        old_values_json := to_jsonb(OLD);
        new_values_json := NULL;
        
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
        VALUES (user_id_val, 'DELETE', TG_TABLE_NAME, OLD.id, old_values_json, new_values_json);
        
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        old_values_json := to_jsonb(OLD);
        new_values_json := to_jsonb(NEW);
        
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
        VALUES (user_id_val, 'UPDATE', TG_TABLE_NAME, NEW.id, old_values_json, new_values_json);
        
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        old_values_json := NULL;
        new_values_json := to_jsonb(NEW);
        
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
        VALUES (user_id_val, 'INSERT', TG_TABLE_NAME, NEW.id, old_values_json, new_values_json);
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================
-- Analytics Functions
-- ===========================

-- Function to update daily analytics
CREATE OR REPLACE FUNCTION update_daily_analytics(target_user_id UUID, target_date DATE)
RETURNS VOID AS $$
DECLARE
    analytics_record productivity_analytics%ROWTYPE;
    completion_rate_val DECIMAL;
    efficiency_score_val DECIMAL;
BEGIN
    -- Calculate task statistics
    SELECT 
        COUNT(*) FILTER (WHERE status != 'cancelled') as planned_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_tasks,
        COALESCE(SUM(estimated_duration) FILTER (WHERE status != 'cancelled'), 0) as planned_minutes,
        COALESCE(SUM(actual_duration) FILTER (WHERE status = 'completed'), 0) as actual_minutes
    INTO 
        analytics_record.tasks_planned,
        analytics_record.tasks_completed,
        analytics_record.tasks_cancelled,
        analytics_record.total_planned_minutes,
        analytics_record.total_actual_minutes
    FROM tasks
    WHERE assignee_id = target_user_id
    AND DATE(start_time) = target_date;
    
    -- Calculate completion rate
    IF analytics_record.tasks_planned > 0 THEN
        completion_rate_val := (analytics_record.tasks_completed::DECIMAL / analytics_record.tasks_planned) * 100;
    ELSE
        completion_rate_val := 0;
    END IF;
    
    -- Calculate efficiency score (planned vs actual time)
    IF analytics_record.total_planned_minutes > 0 AND analytics_record.total_actual_minutes > 0 THEN
        efficiency_score_val := (analytics_record.total_planned_minutes::DECIMAL / analytics_record.total_actual_minutes) * 100;
        efficiency_score_val := LEAST(efficiency_score_val, 200); -- Cap at 200%
    ELSE
        efficiency_score_val := 100;
    END IF;
    
    -- Calculate focus and break time from timeline slots
    SELECT 
        COALESCE(SUM(EXTRACT(EPOCH FROM (actual_end_time - actual_start_time))/60) FILTER (
            WHERE actual_start_time IS NOT NULL 
            AND actual_end_time IS NOT NULL
            AND status = 'completed'
        ), 0) as focus_minutes
    INTO analytics_record.focus_time_minutes
    FROM timeline_slots ts
    JOIN tasks t ON ts.task_id = t.id
    WHERE ts.user_id = target_user_id
    AND ts.date = target_date;
    
    -- Insert or update analytics record
    INSERT INTO productivity_analytics (
        user_id, date, 
        tasks_planned, tasks_completed, tasks_cancelled,
        total_planned_minutes, total_actual_minutes, focus_time_minutes,
        completion_rate, efficiency_score
    ) VALUES (
        target_user_id, target_date,
        analytics_record.tasks_planned, analytics_record.tasks_completed, analytics_record.tasks_cancelled,
        analytics_record.total_planned_minutes, analytics_record.total_actual_minutes, analytics_record.focus_time_minutes,
        completion_rate_val, efficiency_score_val
    )
    ON CONFLICT (user_id, date) 
    DO UPDATE SET
        tasks_planned = EXCLUDED.tasks_planned,
        tasks_completed = EXCLUDED.tasks_completed,
        tasks_cancelled = EXCLUDED.tasks_cancelled,
        total_planned_minutes = EXCLUDED.total_planned_minutes,
        total_actual_minutes = EXCLUDED.total_actual_minutes,
        focus_time_minutes = EXCLUDED.focus_time_minutes,
        completion_rate = EXCLUDED.completion_rate,
        efficiency_score = EXCLUDED.efficiency_score,
        created_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to update analytics when tasks change
CREATE OR REPLACE FUNCTION trigger_analytics_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics for the date when task was scheduled
    IF TG_OP = 'DELETE' THEN
        IF OLD.start_time IS NOT NULL AND OLD.assignee_id IS NOT NULL THEN
            PERFORM update_daily_analytics(OLD.assignee_id, DATE(OLD.start_time));
        END IF;
        RETURN OLD;
    ELSE
        IF NEW.start_time IS NOT NULL AND NEW.assignee_id IS NOT NULL THEN
            PERFORM update_daily_analytics(NEW.assignee_id, DATE(NEW.start_time));
        END IF;
        
        -- Also update for old date if it changed
        IF TG_OP = 'UPDATE' AND OLD.start_time IS NOT NULL AND OLD.assignee_id IS NOT NULL THEN
            IF DATE(OLD.start_time) != DATE(NEW.start_time) OR OLD.assignee_id != NEW.assignee_id THEN
                PERFORM update_daily_analytics(OLD.assignee_id, DATE(OLD.start_time));
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================
-- Task Management Functions
-- ===========================

-- Function to auto-complete timeline slot when task is completed
CREATE OR REPLACE FUNCTION auto_complete_timeline_slot()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE timeline_slots 
        SET 
            status = 'completed',
            actual_end_time = COALESCE(actual_end_time, NOW())
        WHERE task_id = NEW.id 
        AND status != 'completed';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update task actual duration
CREATE OR REPLACE FUNCTION update_task_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.actual_end_time IS NOT NULL AND NEW.actual_start_time IS NOT NULL THEN
        UPDATE tasks 
        SET actual_duration = EXTRACT(EPOCH FROM (NEW.actual_end_time - NEW.actual_start_time))/60
        WHERE id = NEW.task_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================
-- Security Functions
-- ===========================

-- Function to log login attempts
CREATE OR REPLACE FUNCTION log_login_attempt(
    email_param TEXT,
    success_param BOOLEAN,
    ip_param INET DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO login_attempts (email, success, ip_address, user_agent)
    VALUES (email_param, success_param, ip_param, user_agent_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if account should be locked
CREATE OR REPLACE FUNCTION should_lock_account(email_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    failed_attempts INTEGER;
BEGIN
    -- Count failed attempts in last 15 minutes
    SELECT COUNT(*)
    INTO failed_attempts
    FROM login_attempts
    WHERE email = email_param
    AND success = false
    AND attempted_at > NOW() - INTERVAL '15 minutes';
    
    -- Lock after 5 failed attempts
    RETURN failed_attempts >= 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================
-- Organization Functions
-- ===========================

-- Function to automatically add creator as organization owner
CREATE OR REPLACE FUNCTION add_organization_owner()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================
-- Triggers
-- ===========================

-- Updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_slots_updated_at BEFORE UPDATE ON timeline_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_blocks_updated_at BEFORE UPDATE ON time_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User onboarding triggers
CREATE TRIGGER create_user_settings_trigger AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_user_settings();

CREATE TRIGGER create_default_time_blocks_trigger AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_default_time_blocks();

-- Organization triggers
CREATE TRIGGER add_organization_owner_trigger AFTER INSERT ON organizations
    FOR EACH ROW EXECUTE FUNCTION add_organization_owner();

-- Task management triggers
CREATE TRIGGER auto_complete_timeline_slot_trigger AFTER UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION auto_complete_timeline_slot();

CREATE TRIGGER update_task_duration_trigger AFTER UPDATE ON timeline_slots
    FOR EACH ROW EXECUTE FUNCTION update_task_duration();

-- Analytics triggers
CREATE TRIGGER trigger_analytics_update_tasks AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION trigger_analytics_update();

CREATE TRIGGER trigger_analytics_update_timeline AFTER UPDATE ON timeline_slots
    FOR EACH ROW EXECUTE FUNCTION trigger_analytics_update();

-- Audit logging triggers (for sensitive tables)
CREATE TRIGGER audit_users_trigger AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_organizations_trigger AFTER INSERT OR UPDATE OR DELETE ON organizations
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_organization_members_trigger AFTER INSERT OR UPDATE OR DELETE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_projects_trigger AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_subscriptions_trigger AFTER INSERT OR UPDATE OR DELETE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ===========================
-- Helper Functions for Application
-- ===========================

-- Function to get user's current subscription tier
CREATE OR REPLACE FUNCTION get_user_subscription_tier(user_id_param UUID)
RETURNS subscription_tier AS $$
DECLARE
    tier subscription_tier;
BEGIN
    SELECT subscription_tier INTO tier
    FROM users 
    WHERE id = user_id_param;
    
    RETURN COALESCE(tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limit(
    user_id_param UUID,
    resource_type TEXT,
    current_count INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    user_tier subscription_tier;
    limit_value INTEGER;
BEGIN
    user_tier := get_user_subscription_tier(user_id_param);
    
    -- Define limits based on subscription tier and resource type
    CASE resource_type
        WHEN 'projects' THEN
            CASE user_tier
                WHEN 'free' THEN limit_value := 3;
                WHEN 'personal' THEN limit_value := 10;
                WHEN 'pro' THEN limit_value := 50;
                WHEN 'team' THEN limit_value := 100;
                WHEN 'business' THEN limit_value := 500;
                WHEN 'enterprise' THEN limit_value := 9999;
                ELSE limit_value := 3;
            END CASE;
        WHEN 'tasks_per_day' THEN
            CASE user_tier
                WHEN 'free' THEN limit_value := 20;
                WHEN 'personal' THEN limit_value := 100;
                WHEN 'pro' THEN limit_value := 500;
                WHEN 'team' THEN limit_value := 1000;
                WHEN 'business' THEN limit_value := 5000;
                WHEN 'enterprise' THEN limit_value := 9999;
                ELSE limit_value := 20;
            END CASE;
        WHEN 'ai_requests_per_day' THEN
            CASE user_tier
                WHEN 'free' THEN limit_value := 5;
                WHEN 'personal' THEN limit_value := 50;
                WHEN 'pro' THEN limit_value := 200;
                WHEN 'team' THEN limit_value := 500;
                WHEN 'business' THEN limit_value := 2000;
                WHEN 'enterprise' THEN limit_value := 9999;
                ELSE limit_value := 5;
            END CASE;
        ELSE
            limit_value := 9999; -- No limit for unknown resource types
    END CASE;
    
    RETURN current_count < limit_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;