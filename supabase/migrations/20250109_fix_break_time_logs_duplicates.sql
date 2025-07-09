-- 休憩時間ログの重複レコードをクリーンアップし、ユニーク制約を追加

-- 1. 各ユーザー・日付の組み合わせで重複レコードを統合
-- 最古のレコードを残し、他のレコードのdurationを合計する
WITH duplicate_summary AS (
  SELECT 
    user_id,
    date,
    MIN(id) as keep_id,
    SUM(duration) as total_duration
  FROM break_time_logs
  GROUP BY user_id, date
  HAVING COUNT(*) > 1
)
UPDATE break_time_logs
SET duration = ds.total_duration
FROM duplicate_summary ds
WHERE break_time_logs.id = ds.keep_id;

-- 2. 重複レコードを削除（最古のレコード以外）
DELETE FROM break_time_logs
WHERE id NOT IN (
  SELECT MIN(id)
  FROM break_time_logs
  GROUP BY user_id, date
);

-- 3. ユニーク制約を追加して将来的な重複を防ぐ
ALTER TABLE break_time_logs
ADD CONSTRAINT break_time_logs_user_id_date_unique 
UNIQUE (user_id, date);

-- 4. インデックスを追加してパフォーマンスを向上
CREATE INDEX IF NOT EXISTS idx_break_time_logs_user_date 
ON break_time_logs(user_id, date);