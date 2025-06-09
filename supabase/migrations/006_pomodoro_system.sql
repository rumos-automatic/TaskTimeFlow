-- Pomodoro Timer System

-- Pomodoro sessions table
CREATE TABLE pomodoro_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- Session details
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('work', 'shortBreak', 'longBreak')),
    planned_duration INTEGER NOT NULL, -- minutes
    actual_duration INTEGER DEFAULT 0, -- minutes
    completed BOOLEAN DEFAULT false,
    
    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Quality metrics
    interruptions INTEGER DEFAULT 0,
    focus_score INTEGER CHECK (focus_score >= 0 AND focus_score <= 100), -- 0-100 based on interruptions
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5), -- 1-5 rating
    
    -- Notes and tags
    notes TEXT,
    tags TEXT[], -- Array of tags for categorization
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pomodoro statistics and goals
CREATE TABLE pomodoro_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Daily statistics
    total_sessions INTEGER DEFAULT 0,
    completed_sessions INTEGER DEFAULT 0,
    work_sessions INTEGER DEFAULT 0,
    break_sessions INTEGER DEFAULT 0,
    total_focus_time INTEGER DEFAULT 0, -- minutes
    average_focus_score DECIMAL(5,2),
    
    -- Goals and targets
    daily_goal INTEGER DEFAULT 8, -- Number of pomodoros per day
    goal_achieved BOOLEAN DEFAULT false,
    streak_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- Pomodoro achievements and badges
CREATE TABLE pomodoro_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    
    -- Requirements
    requirement_value INTEGER, -- e.g., 100 for "Complete 100 sessions"
    current_progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, achievement_type)
);

-- User pomodoro preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS pomodoro_settings JSONB DEFAULT jsonb_build_object(
    'workDuration', 25,
    'shortBreakDuration', 5,
    'longBreakDuration', 15,
    'sessionsUntilLongBreak', 4,
    'autoStartBreaks', false,
    'autoStartPomodoros', false,
    'soundEnabled', true,
    'notificationsEnabled', true,
    'dailyGoal', 8
);

-- Indexes for performance
CREATE INDEX idx_pomodoro_sessions_user_date ON pomodoro_sessions(user_id, started_at DESC);
CREATE INDEX idx_pomodoro_sessions_task ON pomodoro_sessions(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_pomodoro_sessions_type ON pomodoro_sessions(session_type);
CREATE INDEX idx_pomodoro_sessions_completed ON pomodoro_sessions(completed, started_at DESC);
CREATE INDEX idx_pomodoro_stats_user_date ON pomodoro_stats(user_id, date DESC);
CREATE INDEX idx_pomodoro_achievements_user ON pomodoro_achievements(user_id, completed);

-- Row Level Security
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own pomodoro sessions" ON pomodoro_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own pomodoro sessions" ON pomodoro_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own pomodoro stats" ON pomodoro_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own pomodoro stats" ON pomodoro_stats
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own achievements" ON pomodoro_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own achievements" ON pomodoro_achievements
    FOR ALL USING (auth.uid() = user_id);

-- Functions for automatic statistics calculation
CREATE OR REPLACE FUNCTION update_pomodoro_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily statistics when a session is completed
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        INSERT INTO pomodoro_stats (user_id, date, total_sessions, completed_sessions, work_sessions, break_sessions, total_focus_time)
        VALUES (
            NEW.user_id,
            NEW.started_at::date,
            1,
            1,
            CASE WHEN NEW.session_type = 'work' THEN 1 ELSE 0 END,
            CASE WHEN NEW.session_type IN ('shortBreak', 'longBreak') THEN 1 ELSE 0 END,
            CASE WHEN NEW.session_type = 'work' THEN NEW.actual_duration ELSE 0 END
        )
        ON CONFLICT (user_id, date)
        DO UPDATE SET
            total_sessions = pomodoro_stats.total_sessions + 1,
            completed_sessions = pomodoro_stats.completed_sessions + 1,
            work_sessions = pomodoro_stats.work_sessions + CASE WHEN NEW.session_type = 'work' THEN 1 ELSE 0 END,
            break_sessions = pomodoro_stats.break_sessions + CASE WHEN NEW.session_type IN ('shortBreak', 'longBreak') THEN 1 ELSE 0 END,
            total_focus_time = pomodoro_stats.total_focus_time + CASE WHEN NEW.session_type = 'work' THEN NEW.actual_duration ELSE 0 END,
            updated_at = NOW();
            
        -- Check if daily goal is achieved
        UPDATE pomodoro_stats 
        SET goal_achieved = work_sessions >= daily_goal
        WHERE user_id = NEW.user_id AND date = NEW.started_at::date;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pomodoro_stats_trigger
    AFTER UPDATE ON pomodoro_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_pomodoro_stats();

-- Function to calculate focus score based on interruptions
CREATE OR REPLACE FUNCTION calculate_focus_score(planned_duration INTEGER, interruptions INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Base score is 100, reduced by interruptions
    -- Each interruption reduces score by 10, minimum score is 20
    RETURN GREATEST(20, 100 - (interruptions * 10));
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate focus score
CREATE OR REPLACE FUNCTION set_focus_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.focus_score = calculate_focus_score(NEW.planned_duration, NEW.interruptions);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_focus_score_trigger
    BEFORE INSERT OR UPDATE ON pomodoro_sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_focus_score();

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    total_completed INTEGER;
    current_streak INTEGER;
    max_daily_sessions INTEGER;
BEGIN
    -- Get total completed work sessions
    SELECT COUNT(*) INTO total_completed
    FROM pomodoro_sessions
    WHERE user_id = user_uuid AND session_type = 'work' AND completed = true;
    
    -- First Pomodoro achievement
    INSERT INTO pomodoro_achievements (user_id, achievement_type, achievement_name, description, requirement_value, current_progress, completed, unlocked_at)
    VALUES (user_uuid, 'first_session', 'First Pomodoro', 'Complete your first pomodoro session', 1, total_completed, total_completed >= 1, CASE WHEN total_completed >= 1 THEN NOW() ELSE NULL END)
    ON CONFLICT (user_id, achievement_type) 
    DO UPDATE SET 
        current_progress = total_completed,
        completed = total_completed >= 1,
        unlocked_at = CASE WHEN total_completed >= 1 AND pomodoro_achievements.unlocked_at IS NULL THEN NOW() ELSE pomodoro_achievements.unlocked_at END;
    
    -- Dedication achievements
    INSERT INTO pomodoro_achievements (user_id, achievement_type, achievement_name, description, requirement_value, current_progress, completed, unlocked_at)
    VALUES (user_uuid, 'dedicated_100', 'Dedicated', 'Complete 100 pomodoro sessions', 100, total_completed, total_completed >= 100, CASE WHEN total_completed >= 100 THEN NOW() ELSE NULL END)
    ON CONFLICT (user_id, achievement_type) 
    DO UPDATE SET 
        current_progress = total_completed,
        completed = total_completed >= 100,
        unlocked_at = CASE WHEN total_completed >= 100 AND pomodoro_achievements.unlocked_at IS NULL THEN NOW() ELSE pomodoro_achievements.unlocked_at END;
        
    -- More achievements can be added here...
END;
$$ LANGUAGE plpgsql;

-- Trigger to check achievements when sessions are completed
CREATE OR REPLACE FUNCTION trigger_achievement_check()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        PERFORM check_achievements(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER achievement_check_trigger
    AFTER UPDATE ON pomodoro_sessions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_achievement_check();

-- Insert default achievements for existing users
INSERT INTO pomodoro_achievements (user_id, achievement_type, achievement_name, description, requirement_value, current_progress, completed)
SELECT 
    id as user_id,
    'first_session',
    'First Pomodoro',
    'Complete your first pomodoro session',
    1,
    0,
    false
FROM users
ON CONFLICT (user_id, achievement_type) DO NOTHING;