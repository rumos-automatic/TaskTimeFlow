-- 作業時間ログの重複レコードをクリーンアップし、ユニーク制約を追加

-- 1. 各ユーザー・日付・タスクIDの組み合わせで重複レコードを統合
-- タスクIDがNULLの場合の重複を処理
WITH duplicate_summary_null AS (
  SELECT 
    user_id,
    date,
    MIN(id::text)::uuid as keep_id,
    SUM(duration) as total_duration
  FROM task_time_logs
  WHERE task_id IS NULL
  GROUP BY user_id, date
  HAVING COUNT(*) > 1
)
UPDATE task_time_logs
SET duration = ds.total_duration
FROM duplicate_summary_null ds
WHERE task_time_logs.id = ds.keep_id;

-- 2. タスクIDがNULLの重複レコードを削除（最古のレコード以外）
DELETE FROM task_time_logs
WHERE task_id IS NULL
  AND id NOT IN (
    SELECT MIN(id::text)::uuid
    FROM task_time_logs
    WHERE task_id IS NULL
    GROUP BY user_id, date
  );

-- 3. タスクIDがNULLでない場合の重複を処理（念のため）
WITH duplicate_summary_not_null AS (
  SELECT 
    user_id,
    date,
    task_id,
    MIN(id::text)::uuid as keep_id,
    SUM(duration) as total_duration
  FROM task_time_logs
  WHERE task_id IS NOT NULL
  GROUP BY user_id, date, task_id
  HAVING COUNT(*) > 1
)
UPDATE task_time_logs
SET duration = ds.total_duration
FROM duplicate_summary_not_null ds
WHERE task_time_logs.id = ds.keep_id;

-- 4. タスクIDがNULLでない重複レコードを削除
DELETE FROM task_time_logs
WHERE task_id IS NOT NULL
  AND id NOT IN (
    SELECT MIN(id::text)::uuid
    FROM task_time_logs
    WHERE task_id IS NOT NULL
    GROUP BY user_id, date, task_id
  );

-- 5. 部分ユニークインデックスを追加（task_idがNULLの場合）
CREATE UNIQUE INDEX IF NOT EXISTS task_time_logs_user_date_null_unique
ON task_time_logs (user_id, date)
WHERE task_id IS NULL;

-- 6. 通常のユニーク制約を追加（task_idがNULLでない場合）
ALTER TABLE task_time_logs
DROP CONSTRAINT IF EXISTS task_time_logs_user_date_task_unique;

ALTER TABLE task_time_logs
ADD CONSTRAINT task_time_logs_user_date_task_unique
UNIQUE (user_id, date, task_id);

-- 7. パフォーマンス向上のためのインデックス
CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_date 
ON task_time_logs(user_id, date);

CREATE INDEX IF NOT EXISTS idx_task_time_logs_task_id
ON task_time_logs(task_id)
WHERE task_id IS NOT NULL;

-- 8. 重複削除後の統計情報を確認
DO $$
DECLARE
  null_count INTEGER;
  not_null_count INTEGER;
BEGIN
  -- task_idがNULLの残りの重複を確認
  SELECT COUNT(*) INTO null_count
  FROM (
    SELECT user_id, date, COUNT(*)
    FROM task_time_logs
    WHERE task_id IS NULL
    GROUP BY user_id, date
    HAVING COUNT(*) > 1
  ) AS duplicates;
  
  -- task_idがNULLでない残りの重複を確認
  SELECT COUNT(*) INTO not_null_count
  FROM (
    SELECT user_id, date, task_id, COUNT(*)
    FROM task_time_logs
    WHERE task_id IS NOT NULL
    GROUP BY user_id, date, task_id
    HAVING COUNT(*) > 1
  ) AS duplicates;
  
  RAISE NOTICE 'Remaining duplicates - NULL task_id: %, NOT NULL task_id: %', null_count, not_null_count;
END $$;