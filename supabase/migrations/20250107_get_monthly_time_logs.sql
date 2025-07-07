-- 月ごとの作業時間・休憩時間を集計するRPC
CREATE OR REPLACE FUNCTION get_monthly_time_logs(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  date DATE,
  work_time INTEGER,
  break_time INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    -- 指定月の日付範囲を生成
    SELECT date::DATE
    FROM generate_series(
      DATE(p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01'),
      (DATE(p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01') + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
      '1 day'::INTERVAL
    ) AS date
  ),
  work_logs AS (
    -- タスクごとの作業時間を日付でグループ化
    SELECT 
      ttl.date,
      SUM(ttl.duration) AS total_work_time
    FROM task_time_logs ttl
    WHERE ttl.user_id = p_user_id
      AND EXTRACT(YEAR FROM ttl.date) = p_year
      AND EXTRACT(MONTH FROM ttl.date) = p_month
    GROUP BY ttl.date
  ),
  break_logs AS (
    -- 休憩時間を日付でグループ化
    SELECT 
      btl.date,
      SUM(btl.duration) AS total_break_time
    FROM break_time_logs btl
    WHERE btl.user_id = p_user_id
      AND EXTRACT(YEAR FROM btl.date) = p_year
      AND EXTRACT(MONTH FROM btl.date) = p_month
    GROUP BY btl.date
  )
  SELECT 
    dr.date,
    COALESCE(wl.total_work_time, 0)::INTEGER AS work_time,
    COALESCE(bl.total_break_time, 0)::INTEGER AS break_time
  FROM date_range dr
  LEFT JOIN work_logs wl ON dr.date = wl.date
  LEFT JOIN break_logs bl ON dr.date = bl.date
  WHERE wl.total_work_time > 0 OR bl.total_break_time > 0
  ORDER BY dr.date;
END;
$$;

-- RLSポリシーを設定（関数はRLSの影響を受けないが、呼び出し元で権限チェックが必要）
COMMENT ON FUNCTION get_monthly_time_logs IS 'Get aggregated work and break time logs for a specific month';