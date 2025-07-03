# Supabase SQL実行ガイド（画像付き詳細版）

## 📋 目次
1. [Supabaseダッシュボードへのアクセス](#1-supabaseダッシュボードへのアクセス)
2. [SQL Editorの使い方](#2-sql-editorの使い方)
3. [SQLの実行手順](#3-sqlの実行手順)
4. [実行結果の確認](#4-実行結果の確認)
5. [トラブルシューティング](#5-トラブルシューティング)

---

## 1. Supabaseダッシュボードへのアクセス

### ステップ1: Supabaseにログイン
1. ブラウザで [https://app.supabase.com](https://app.supabase.com) を開きます
2. 以下のいずれかの方法でログインします：
   - GitHub アカウント
   - Google アカウント
   - メールアドレスとパスワード

### ステップ2: プロジェクトを選択
1. ログイン後、プロジェクト一覧が表示されます
2. 「TaskTimeFlow」または該当するプロジェクト名をクリックします
   - プロジェクトURLが `auyykgeagridyjhzqxjb.supabase.co` のものを選択

---

## 2. SQL Editorの使い方

### SQL Editorへのアクセス方法

1. **左側のサイドバーを確認**
   - 縦に並んでいるメニューアイコンがあります
   
2. **「SQL Editor」を探す**
   - 通常、以下のアイコンの中にあります：
     - 🏠 Home（ホーム）
     - 📊 Table Editor（テーブルエディタ）
     - **📝 SQL Editor（SQLエディタ）** ← これをクリック！
     - 🔐 Authentication（認証）
     - ⚡ Database（データベース）
     - 📦 Storage（ストレージ）

3. **SQL Editorアイコンをクリック**
   - コードエディタのようなアイコン（`< >`のような形）
   - クリックすると右側にSQLエディタが開きます

---

## 3. SQLの実行手順

### ステップ1: 新しいクエリを作成

1. SQL Editorが開いたら、右上の「**+ New query**」ボタンをクリック
   - または、既存のタブに直接SQLを入力してもOK

### ステップ2: 最初のSQL（認証トリガー）を実行

1. **以下のSQLをコピーして、エディタに貼り付けます：**

```sql
-- profilesテーブルへの新規ユーザー自動挿入トリガー
-- このトリガーはauth.usersに新規ユーザーが作成された時に自動的にprofilesテーブルにレコードを作成します

-- Function: 新規ユーザーのプロファイルを作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auth.usersに新規ユーザーが作成された時に実行
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS (Row Level Security) ポリシーの設定
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のプロファイルのみ参照可能
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- ユーザーは自分のプロファイルのみ更新可能
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ユーザーは自分のプロファイルのみ削除可能
CREATE POLICY "Users can delete own profile"
  ON profiles
  FOR DELETE
  USING (auth.uid() = id);
```

2. **実行ボタンを押す**
   - エディタの下部にある「**RUN**」ボタンをクリック
   - または、キーボードショートカット：
     - Windows: `Ctrl + Enter`
     - Mac: `Cmd + Enter`

3. **実行結果を確認**
   - 下部に「Success. No rows returned」と表示されればOK
   - エラーが出た場合は、エラーメッセージを確認

### ステップ3: 2つ目のSQL（ユーザーデータ設定）を実行

1. **新しいタブを作成**または**既存のSQLをクリア**

2. **以下のSQLをコピーして貼り付け：**

```sql
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

-- 以降のRLSポリシー設定も同様に続きます...
```

3. **同様に「RUN」ボタンで実行**

### ステップ4: 既存ユーザーの修復（必要な場合）

もし既にユーザーが存在している場合は、以下も実行：

```sql
-- 既存のauth.usersユーザーに対してprofilesレコードを作成
INSERT INTO public.profiles (id, email, full_name)
SELECT 
    id,
    email,
    raw_user_meta_data->>'full_name'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
```

---

## 4. 実行結果の確認

### 成功した場合
- 「Success. No rows returned」というメッセージが表示されます
- 緑色のチェックマークが表示される場合もあります

### テーブルで確認する方法

1. 左サイドバーの「**Table Editor**」をクリック
2. 「profiles」テーブルを選択
3. データが正しく表示されているか確認

### トリガーが作成されたか確認

SQL Editorで以下を実行：

```sql
-- トリガーの一覧を表示
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

---

## 5. トラブルシューティング

### よくあるエラーと対処法

#### エラー1: "permission denied for schema public"
**原因**: 権限不足
**対処法**: 
- プロジェクトのオーナーアカウントでログインしているか確認
- Settings → Database → Connection string で Service Roleを使用

#### エラー2: "relation "profiles" does not exist"
**原因**: profilesテーブルがまだ作成されていない
**対処法**:
1. Table Editorでprofilesテーブルを先に作成
2. または、以下のSQLを先に実行：

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### エラー3: "duplicate key value violates unique constraint"
**原因**: 既に同じトリガーやポリシーが存在
**対処法**: CREATE OR REPLACEを使用しているので、通常は発生しません。発生した場合は一度削除してから再作成。

### SQL実行履歴の確認

1. SQL Editorの右側に「History」タブがあります
2. クリックすると過去に実行したSQLの履歴が表示されます
3. 再実行したい場合は、履歴から選択してクリック

---

## 🎯 次のステップ

SQLの実行が完了したら：

1. **テストスクリプトを実行**
   ```bash
   node scripts/test-auth.js
   ```

2. **アプリケーションで新規登録をテスト**
   - ブラウザで `http://localhost:3000` を開く
   - 新規アカウント作成を試みる

3. **問題が続く場合**
   - SQL Editorでエラーメッセージを確認
   - Table Editorでデータを確認
   - ブラウザの開発者ツールでコンソールエラーを確認

---

## 📞 サポート

問題が解決しない場合は、以下の情報を共有してください：
- SQL実行時のエラーメッセージ
- `node scripts/test-auth.js` の実行結果
- ブラウザコンソールのエラーメッセージ