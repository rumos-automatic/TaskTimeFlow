-- break_time_logsテーブルの作成
CREATE TABLE IF NOT EXISTS break_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  duration INTEGER DEFAULT 0, -- 秒単位の休憩時間
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  
  -- ユーザーIDと日付の組み合わせでユニーク制約
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- インデックスの作成
CREATE INDEX idx_break_time_logs_user_id ON break_time_logs(user_id);
CREATE INDEX idx_break_time_logs_date ON break_time_logs(date);
CREATE INDEX idx_break_time_logs_user_date ON break_time_logs(user_id, date);

-- RLSポリシーの有効化
ALTER TABLE break_time_logs ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の休憩時間ログのみ参照可能
CREATE POLICY "Users can view own break_time_logs"
  ON break_time_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- ユーザーは自分の休憩時間ログのみ作成可能
CREATE POLICY "Users can create own break_time_logs"
  ON break_time_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ユーザーは自分の休憩時間ログのみ更新可能
CREATE POLICY "Users can update own break_time_logs"
  ON break_time_logs
  FOR UPDATE
  USING (user_id = auth.uid());

-- ユーザーは自分の休憩時間ログのみ削除可能
CREATE POLICY "Users can delete own break_time_logs"
  ON break_time_logs
  FOR DELETE
  USING (user_id = auth.uid());

-- updated_atを自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_atを自動更新するトリガー
CREATE TRIGGER update_break_time_logs_updated_at
  BEFORE UPDATE ON break_time_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- task_time_logsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS task_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  duration INTEGER DEFAULT 0, -- 秒単位の作業時間
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  
  -- ユーザーID、タスクID（NULL可）、日付の組み合わせでユニーク制約
  CONSTRAINT unique_user_task_date UNIQUE (user_id, task_id, date)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_id ON task_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_task_id ON task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_date ON task_time_logs(date);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_date ON task_time_logs(user_id, date);

-- RLSポリシーの有効化
ALTER TABLE task_time_logs ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のタスク時間ログのみ参照可能
CREATE POLICY IF NOT EXISTS "Users can view own task_time_logs"
  ON task_time_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- ユーザーは自分のタスク時間ログのみ作成可能
CREATE POLICY IF NOT EXISTS "Users can create own task_time_logs"
  ON task_time_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ユーザーは自分のタスク時間ログのみ更新可能
CREATE POLICY IF NOT EXISTS "Users can update own task_time_logs"
  ON task_time_logs
  FOR UPDATE
  USING (user_id = auth.uid());

-- ユーザーは自分のタスク時間ログのみ削除可能
CREATE POLICY IF NOT EXISTS "Users can delete own task_time_logs"
  ON task_time_logs
  FOR DELETE
  USING (user_id = auth.uid());

-- updated_atを自動更新するトリガー
CREATE TRIGGER IF NOT EXISTS update_task_time_logs_updated_at
  BEFORE UPDATE ON task_time_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();