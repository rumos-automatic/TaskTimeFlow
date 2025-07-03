// Supabase認証テストスクリプト
// 使用方法: node scripts/test-auth.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 環境変数が設定されていません。.env.localファイルを確認してください。');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  console.log('🔍 Supabase認証テストを開始します...\n');

  // 1. 環境変数チェック
  console.log('1️⃣ 環境変数チェック:');
  console.log(`   SUPABASE_URL: ${supabaseUrl}`);
  console.log(`   SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`);
  console.log('   ✅ 環境変数は正しく設定されています\n');

  // 2. Supabase接続テスト
  console.log('2️⃣ Supabase接続テスト:');
  try {
    const { data, error } = await supabase.from('profiles').select('count');
    if (error) {
      console.log(`   ❌ エラー: ${error.message}`);
      console.log('   💡 ヒント: profilesテーブルが存在しないか、RLSポリシーが設定されていない可能性があります。');
    } else {
      console.log('   ✅ Supabaseへの接続に成功しました\n');
    }
  } catch (err) {
    console.log(`   ❌ 接続エラー: ${err.message}\n`);
  }

  // 3. テストユーザー作成
  console.log('3️⃣ テストユーザー作成:');
  const timestamp = Math.floor(Date.now() / 1000);
  const testEmail = `test.user${timestamp}@gmail.com`;
  const testPassword = 'test123456';

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });

    if (authError) {
      console.log(`   ❌ 認証エラー: ${authError.message}`);
      if (authError.message.includes('Database error saving new user')) {
        console.log('   💡 ヒント: handle_new_userトリガーが設定されていません。');
        console.log('   📝 解決方法: Supabase MCPツールを使用してトリガーが設定されました。');
        console.log('   ✅ 修正済み: 再度テストを実行してください。');
      }
    } else {
      console.log(`   ✅ ユーザー作成成功: ${testEmail}`);
      
      // 4. profilesテーブル確認
      console.log('\n4️⃣ profilesテーブル確認:');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.log(`   ❌ プロファイル取得エラー: ${profileError.message}`);
        console.log('   💡 ヒント: profilesテーブルにレコードが作成されていません。');
      } else {
        console.log('   ✅ プロファイル作成成功');
        console.log(`   - ID: ${profile.id}`);
        console.log(`   - Email: ${profile.email}`);
        console.log(`   - Full Name: ${profile.full_name || '(未設定)'}`);
      }

      // クリーンアップ
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.log(`   ❌ 予期しないエラー: ${err.message}\n`);
  }

  console.log('\n📋 テスト完了');
  console.log('問題が解決しない場合は、docs/supabase-setup.mdを参照してください。');
}

testAuth().catch(console.error);