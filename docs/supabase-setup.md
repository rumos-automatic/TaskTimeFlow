# Supabase セットアップガイド

このガイドでは、TaskTimeFlowで新規アカウント作成エラー「Database error saving new user」を解決するための手順を説明します。

## 問題の原因

新規ユーザー作成時に、Supabaseの認証システム（auth.users）とアプリケーションのprofilesテーブルが正しく連携していないため、エラーが発生しています。

## 解決手順

### 1. Supabaseダッシュボードにログイン

1. [Supabase Dashboard](https://app.supabase.com) にアクセス
2. TaskTimeFlowプロジェクトを選択

### 2. SQL Editorでマイグレーションを実行

1. 左側のメニューから「SQL Editor」を選択
2. 以下のSQLを実行：

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

### 3. 既存のユーザーデータの修復（必要な場合）

既にauth.usersにユーザーが存在するが、profilesテーブルにレコードがない場合は、以下のSQLを実行：

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

### 4. Google OAuth設定の確認

1. Supabaseダッシュボードで「Authentication」→「Providers」を選択
2. Googleプロバイダーが有効になっていることを確認
3. Google Cloud ConsoleでOAuth 2.0クライアントIDを作成し、以下の設定を確認：
   - 承認済みのJavaScriptオリジン: `https://auyykgeagridyjhzqxjb.supabase.co`
   - 承認済みのリダイレクトURI: `https://auyykgeagridyjhzqxjb.supabase.co/auth/v1/callback`

### 5. アプリケーションの設定確認

`.env.local`ファイルに以下の環境変数が正しく設定されていることを確認：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://auyykgeagridyjhzqxjb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## テスト方法

### 自動テストスクリプトの実行

認証システムが正しく設定されているか確認するためのテストスクリプトを用意しています：

```bash
node scripts/test-auth.js
```

このスクリプトは以下をチェックします：
- 環境変数の設定
- Supabaseへの接続
- ユーザー作成機能
- profilesテーブルへの自動挿入

### 手動テスト

1. アプリケーションを再起動: `npm run dev`
2. 新規アカウント作成を試みる
3. Googleアカウントでのログインを試みる

## トラブルシューティング

### エラーが続く場合

1. Supabaseダッシュボードの「Table Editor」でprofilesテーブルの構造を確認
2. 「Logs」セクションでエラーログを確認
3. ブラウザの開発者ツールでコンソールエラーを確認

### よくある問題

- **RLSポリシーエラー**: 上記のRLSポリシーが正しく設定されているか確認
- **トリガーエラー**: トリガーが正しく作成されているか、SQL Editorで`\df`コマンドで確認
- **権限エラー**: Service Roleキーを使用していないか確認（クライアントサイドではAnon Keyを使用）

## 参考情報

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database Triggers](https://supabase.com/docs/guides/database/postgres/triggers)