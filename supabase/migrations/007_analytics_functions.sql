-- Analytics and Reporting Functions

-- Function to get daily productivity statistics
CREATE OR REPLACE FUNCTION get_daily_productivity_stats(
    user_uuid UUID,
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    date TEXT,
    tasks_completed INTEGER,
    tasks_created INTEGER,
    completion_rate DECIMAL,
    focus_time INTEGER,
    pomodoro_sessions INTEGER,
    efficiency_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(start_date, end_date, '1 day'::interval)::date AS day
    ),
    daily_tasks AS (
        SELECT 
            t.created_at::date AS day,
            COUNT(*) AS created_count,
            COUNT(*) FILTER (WHERE t.status = 'completed') AS completed_count,
            SUM(COALESCE(t.actual_duration, 0)) AS total_duration
        FROM tasks t
        WHERE t.created_by = user_uuid
        AND t.created_at::date BETWEEN start_date AND end_date
        GROUP BY t.created_at::date
    ),
    daily_pomodoros AS (
        SELECT 
            ps.started_at::date AS day,
            COUNT(*) FILTER (WHERE ps.completed = true AND ps.session_type = 'work') AS work_sessions,
            SUM(COALESCE(ps.actual_duration, 0)) FILTER (WHERE ps.completed = true AND ps.session_type = 'work') AS focus_minutes
        FROM pomodoro_sessions ps
        WHERE ps.user_id = user_uuid
        AND ps.started_at::date BETWEEN start_date AND end_date
        GROUP BY ps.started_at::date
    )
    SELECT 
        ds.day::text,
        COALESCE(dt.completed_count, 0)::integer,
        COALESCE(dt.created_count, 0)::integer,
        CASE 
            WHEN COALESCE(dt.created_count, 0) = 0 THEN 0.0
            ELSE (COALESCE(dt.completed_count, 0)::decimal / dt.created_count * 100)
        END,
        COALESCE(dp.focus_minutes, 0)::integer,
        COALESCE(dp.work_sessions, 0)::integer,
        -- Calculate efficiency score (composite of completion rate and focus time)
        CASE 
            WHEN COALESCE(dt.created_count, 0) = 0 AND COALESCE(dp.work_sessions, 0) = 0 THEN 0.0
            ELSE (
                (CASE WHEN COALESCE(dt.created_count, 0) = 0 THEN 0 ELSE (COALESCE(dt.completed_count, 0)::decimal / dt.created_count * 100) END * 0.6) +
                (LEAST(COALESCE(dp.focus_minutes, 0)::decimal / 480 * 100, 100) * 0.4)
            )
        END
    FROM date_series ds
    LEFT JOIN daily_tasks dt ON ds.day = dt.day
    LEFT JOIN daily_pomodoros dp ON ds.day = dp.day
    ORDER BY ds.day;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate productivity trends
CREATE OR REPLACE FUNCTION get_productivity_trends(
    user_uuid UUID,
    current_start DATE,
    current_end DATE,
    previous_start DATE,
    previous_end DATE
)
RETURNS TABLE (
    metric TEXT,
    current_value DECIMAL,
    previous_value DECIMAL,
    change_percentage DECIMAL,
    trend_direction TEXT
) AS $$
DECLARE
    current_completion_rate DECIMAL;
    previous_completion_rate DECIMAL;
    current_focus_time INTEGER;
    previous_focus_time INTEGER;
    current_efficiency DECIMAL;
    previous_efficiency DECIMAL;
BEGIN
    -- Calculate current period metrics
    SELECT 
        CASE WHEN COUNT(*) = 0 THEN 0 ELSE COUNT(*) FILTER (WHERE status = 'completed')::decimal / COUNT(*) * 100 END,
        COALESCE(SUM(actual_duration), 0)
    INTO current_completion_rate, current_focus_time
    FROM tasks 
    WHERE created_by = user_uuid 
    AND created_at::date BETWEEN current_start AND current_end;

    -- Calculate previous period metrics
    SELECT 
        CASE WHEN COUNT(*) = 0 THEN 0 ELSE COUNT(*) FILTER (WHERE status = 'completed')::decimal / COUNT(*) * 100 END,
        COALESCE(SUM(actual_duration), 0)
    INTO previous_completion_rate, previous_focus_time
    FROM tasks 
    WHERE created_by = user_uuid 
    AND created_at::date BETWEEN previous_start AND previous_end;

    -- Calculate efficiency scores
    current_efficiency := (current_completion_rate * 0.6) + (LEAST(current_focus_time::decimal / 480 * 100, 100) * 0.4);
    previous_efficiency := (previous_completion_rate * 0.6) + (LEAST(previous_focus_time::decimal / 480 * 100, 100) * 0.4);

    -- Return completion rate trend
    RETURN QUERY
    SELECT 
        'completion_rate'::text,
        current_completion_rate,
        previous_completion_rate,
        CASE WHEN previous_completion_rate = 0 THEN 0 ELSE ((current_completion_rate - previous_completion_rate) / previous_completion_rate * 100) END,
        CASE 
            WHEN current_completion_rate > previous_completion_rate THEN 'up'
            WHEN current_completion_rate < previous_completion_rate THEN 'down'
            ELSE 'stable'
        END::text;

    -- Return focus time trend (convert to hours)
    RETURN QUERY
    SELECT 
        'focus_time'::text,
        (current_focus_time / 60)::decimal,
        (previous_focus_time / 60)::decimal,
        CASE WHEN previous_focus_time = 0 THEN 0 ELSE ((current_focus_time - previous_focus_time)::decimal / previous_focus_time * 100) END,
        CASE 
            WHEN current_focus_time > previous_focus_time THEN 'up'
            WHEN current_focus_time < previous_focus_time THEN 'down'
            ELSE 'stable'
        END::text;

    -- Return efficiency trend
    RETURN QUERY
    SELECT 
        'efficiency_score'::text,
        current_efficiency,
        previous_efficiency,
        CASE WHEN previous_efficiency = 0 THEN 0 ELSE ((current_efficiency - previous_efficiency) / previous_efficiency * 100) END,
        CASE 
            WHEN current_efficiency > previous_efficiency THEN 'up'
            WHEN current_efficiency < previous_efficiency THEN 'down'
            ELSE 'stable'
        END::text;
END;
$$ LANGUAGE plpgsql;

-- Function to get task completion summary
CREATE OR REPLACE FUNCTION get_task_completion_summary(
    user_uuid UUID,
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    total_created INTEGER,
    total_completed INTEGER,
    completion_rate DECIMAL,
    avg_completion_time DECIMAL,
    overdue_tasks INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::integer AS total_created,
        COUNT(*) FILTER (WHERE status = 'completed')::integer AS total_completed,
        CASE WHEN COUNT(*) = 0 THEN 0::decimal ELSE (COUNT(*) FILTER (WHERE status = 'completed')::decimal / COUNT(*) * 100) END AS completion_rate,
        AVG(COALESCE(actual_duration, 0))::decimal AS avg_completion_time,
        COUNT(*) FILTER (WHERE status != 'completed' AND due_date < CURRENT_DATE)::integer AS overdue_tasks
    FROM tasks 
    WHERE created_by = user_uuid 
    AND created_at::date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get pomodoro session summary
CREATE OR REPLACE FUNCTION get_pomodoro_session_summary(
    user_uuid UUID,
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    total_sessions INTEGER,
    completed_sessions INTEGER,
    total_focus_time INTEGER,
    average_session_duration DECIMAL,
    best_focus_score INTEGER,
    sessions_by_hour JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::integer,
        COUNT(*) FILTER (WHERE completed = true)::integer,
        SUM(COALESCE(actual_duration, 0)) FILTER (WHERE completed = true AND session_type = 'work')::integer,
        AVG(actual_duration) FILTER (WHERE completed = true)::decimal,
        MAX(focus_score)::integer,
        (
            SELECT jsonb_object_agg(
                hour, 
                session_count
            )
            FROM (
                SELECT 
                    EXTRACT(hour FROM started_at)::text AS hour,
                    COUNT(*)::integer AS session_count
                FROM pomodoro_sessions ps_inner
                WHERE ps_inner.user_id = user_uuid
                AND ps_inner.started_at::date BETWEEN start_date AND end_date
                GROUP BY EXTRACT(hour FROM started_at)
                ORDER BY EXTRACT(hour FROM started_at)
            ) hourly_data
        )
    FROM pomodoro_sessions ps
    WHERE ps.user_id = user_uuid 
    AND ps.started_at::date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get time distribution by labels
CREATE OR REPLACE FUNCTION get_time_distribution(
    user_uuid UUID,
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    category TEXT,
    total_minutes INTEGER,
    task_count INTEGER,
    avg_duration DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH label_stats AS (
        SELECT 
            unnest(COALESCE(labels, ARRAY['未分類'])) AS label,
            actual_duration,
            1 AS task_weight
        FROM tasks
        WHERE created_by = user_uuid
        AND status = 'completed'
        AND actual_duration IS NOT NULL
        AND completed_at::date BETWEEN start_date AND end_date
    )
    SELECT 
        label AS category,
        SUM(actual_duration)::integer AS total_minutes,
        COUNT(*)::integer AS task_count,
        AVG(actual_duration)::decimal AS avg_duration
    FROM label_stats
    GROUP BY label
    ORDER BY SUM(actual_duration) DESC;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_date ON tasks(created_by, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_date ON tasks(created_by, completed_at) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_date ON pomodoro_sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_completed ON pomodoro_sessions(user_id, completed, session_type);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_daily_productivity_stats(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_productivity_trends(UUID, DATE, DATE, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_completion_summary(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pomodoro_session_summary(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_time_distribution(UUID, DATE, DATE) TO authenticated;