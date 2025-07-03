-- TaskTimeFlow 認証エラー修正用SQL
-- このファイルの内容を全てコピーして、Supabase SQL Editorで実行してください

-- ========================================
-- 1. profilesテーブルが存在しない場合は作成
-- ========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. 認証トリガーの作成
-- ========================================

-- Function: 新規ユーザーのプロファイルを作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auth.usersに新規ユーザーが作成された時に実行
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 3. RLSポリシーの設定
-- ========================================

-- RLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（エラーを避けるため）
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- 新しいポリシーを作成
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ========================================
-- 4. 既存ユーザーの修復
-- ========================================

-- 既存のauth.usersユーザーに対してprofilesレコードを作成
INSERT INTO public.profiles (id, email, full_name)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 5. custom_categoriesテーブルの準備
-- ========================================

-- テーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS public.custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  is_built_in BOOLEAN DEFAULT false,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view own categories" ON custom_categories;
DROP POLICY IF EXISTS "Users can create own categories" ON custom_categories;
DROP POLICY IF EXISTS "Users can update own categories" ON custom_categories;
DROP POLICY IF EXISTS "Users can delete own non-builtin categories" ON custom_categories;

-- カテゴリのRLSポリシー
CREATE POLICY "Users can view own categories"
  ON custom_categories FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own categories"
  ON custom_categories FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own categories"
  ON custom_categories FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own non-builtin categories"
  ON custom_categories FOR DELETE
  USING (user_id = auth.uid() AND is_built_in = false);

-- ========================================
-- 6. デフォルトカテゴリ作成機能
-- ========================================

-- Function: ユーザーのデフォルトカテゴリを作成
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger AS $$
BEGIN
  -- デフォルトカテゴリを作成
  INSERT INTO public.custom_categories (user_id, name, color, icon, description, is_built_in, "order")
  VALUES 
    (NEW.id, '仕事', '#3b82f6', '💼', '仕事関連のタスク', true, 1),
    (NEW.id, '個人', '#10b981', '🏠', '個人的なタスク', true, 2),
    (NEW.id, 'Googleタスク', '#ea4335', '📋', 'Google Tasksからインポート', true, 3)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: profilesテーブルに新規レコードが作成された時に実行
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_categories();

-- ========================================
-- 7. 既存ユーザーにデフォルトカテゴリを作成
-- ========================================

-- 既存のユーザーにデフォルトカテゴリがない場合は作成
INSERT INTO public.custom_categories (user_id, name, color, icon, description, is_built_in, "order")
SELECT 
    p.id as user_id,
    cat.name,
    cat.color,
    cat.icon,
    cat.description,
    cat.is_built_in,
    cat.order
FROM public.profiles p
CROSS JOIN (
    VALUES 
        ('仕事', '#3b82f6', '💼', '仕事関連のタスク', true, 1),
        ('個人', '#10b981', '🏠', '個人的なタスク', true, 2),
        ('Googleタスク', '#ea4335', '📋', 'Google Tasksからインポート', true, 3)
) AS cat(name, color, icon, description, is_built_in, order)
WHERE NOT EXISTS (
    SELECT 1 FROM public.custom_categories cc 
    WHERE cc.user_id = p.id AND cc.name = cat.name
)
ON CONFLICT DO NOTHING;

-- ========================================
-- 8. 確認用クエリ
-- ========================================

-- トリガーが正しく作成されたか確認
SELECT 
    'トリガー作成確認' as check_type,
    COUNT(*) as count,
    string_agg(trigger_name, ', ') as triggers
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name IN ('on_auth_user_created', 'on_profile_created');

-- profilesテーブルのレコード数を確認
SELECT 
    'profilesテーブル' as table_name,
    COUNT(*) as record_count
FROM public.profiles;

-- custom_categoriesテーブルのレコード数を確認
SELECT 
    'custom_categoriesテーブル' as table_name,
    COUNT(*) as record_count
FROM public.custom_categories;

-- ========================================
-- 実行完了！
-- ========================================
-- このSQLの実行が完了したら、新規アカウント作成を再度試してください。