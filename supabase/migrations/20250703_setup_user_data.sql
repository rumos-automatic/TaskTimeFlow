-- ユーザー関連データの初期設定
-- このスクリプトは新規ユーザー作成時に必要なデフォルトデータを作成します

-- Function: ユーザーのデフォルトカテゴリを作成
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger AS $$
BEGIN
  -- デフォルトカテゴリを作成
  INSERT INTO public.custom_categories (user_id, name, color, icon, description, is_built_in, "order")
  VALUES 
    (NEW.id, '仕事', '#3b82f6', '💼', '仕事関連のタスク', true, 1),
    (NEW.id, '個人', '#10b981', '🏠', '個人的なタスク', true, 2),
    (NEW.id, 'Googleタスク', '#ea4335', '📋', 'Google Tasksからインポート', true, 3);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: profilesテーブルに新規レコードが作成された時に実行
CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_categories();

-- タスクテーブルのRLSポリシー
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のタスクのみ参照可能
CREATE POLICY "Users can view own tasks"
  ON tasks
  FOR SELECT
  USING (user_id = auth.uid());

-- ユーザーは自分のタスクのみ作成可能
CREATE POLICY "Users can create own tasks"
  ON tasks
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ユーザーは自分のタスクのみ更新可能
CREATE POLICY "Users can update own tasks"
  ON tasks
  FOR UPDATE
  USING (user_id = auth.uid());

-- ユーザーは自分のタスクのみ削除可能
CREATE POLICY "Users can delete own tasks"
  ON tasks
  FOR DELETE
  USING (user_id = auth.uid());

-- カスタムカテゴリテーブルのRLSポリシー
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のカテゴリのみ参照可能
CREATE POLICY "Users can view own categories"
  ON custom_categories
  FOR SELECT
  USING (user_id = auth.uid());

-- ユーザーは自分のカテゴリのみ作成可能
CREATE POLICY "Users can create own categories"
  ON custom_categories
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ユーザーは自分のカテゴリのみ更新可能
CREATE POLICY "Users can update own categories"
  ON custom_categories
  FOR UPDATE
  USING (user_id = auth.uid());

-- ユーザーは自分のカテゴリのみ削除可能（ビルトインカテゴリは除く）
CREATE POLICY "Users can delete own non-builtin categories"
  ON custom_categories
  FOR DELETE
  USING (user_id = auth.uid() AND is_built_in = false);

-- タイムスロットテーブルのRLSポリシー
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のタイムスロットのみ参照可能
CREATE POLICY "Users can view own time_slots"
  ON time_slots
  FOR SELECT
  USING (user_id = auth.uid());

-- ユーザーは自分のタイムスロットのみ作成可能
CREATE POLICY "Users can create own time_slots"
  ON time_slots
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ユーザーは自分のタイムスロットのみ更新可能
CREATE POLICY "Users can update own time_slots"
  ON time_slots
  FOR UPDATE
  USING (user_id = auth.uid());

-- ユーザーは自分のタイムスロットのみ削除可能
CREATE POLICY "Users can delete own time_slots"
  ON time_slots
  FOR DELETE
  USING (user_id = auth.uid());

-- タイマー設定テーブルのRLSポリシー
ALTER TABLE timer_settings ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のタイマー設定のみ参照可能
CREATE POLICY "Users can view own timer_settings"
  ON timer_settings
  FOR SELECT
  USING (user_id = auth.uid());

-- ユーザーは自分のタイマー設定のみ作成可能
CREATE POLICY "Users can create own timer_settings"
  ON timer_settings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ユーザーは自分のタイマー設定のみ更新可能
CREATE POLICY "Users can update own timer_settings"
  ON timer_settings
  FOR UPDATE
  USING (user_id = auth.uid());

-- カレンダーイベントテーブルのRLSポリシー
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のカレンダーイベントのみ参照可能
CREATE POLICY "Users can view own calendar_events"
  ON calendar_events
  FOR SELECT
  USING (user_id = auth.uid());

-- ユーザーは自分のカレンダーイベントのみ作成可能
CREATE POLICY "Users can create own calendar_events"
  ON calendar_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ユーザーは自分のカレンダーイベントのみ更新可能
CREATE POLICY "Users can update own calendar_events"
  ON calendar_events
  FOR UPDATE
  USING (user_id = auth.uid());

-- ユーザーは自分のカレンダーイベントのみ削除可能
CREATE POLICY "Users can delete own calendar_events"
  ON calendar_events
  FOR DELETE
  USING (user_id = auth.uid());

-- 作業時間ログテーブルのRLSポリシー
ALTER TABLE work_time_logs ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の作業時間ログのみ参照可能
CREATE POLICY "Users can view own work_time_logs"
  ON work_time_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- ユーザーは自分の作業時間ログのみ作成可能
CREATE POLICY "Users can create own work_time_logs"
  ON work_time_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 休憩時間ログテーブルのRLSポリシー
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