# TaskTimeFlow ドメイン構造・ルーティング戦略

## 📊 現在の構造分析

### 現状の問題点
1. **すべてのページが認証必須**: AuthGuardがroot layoutで適用されている
2. **LPが存在しない**: 未認証ユーザーが製品を理解できない
3. **法的ページも認証必須**: プライバシーポリシー・利用規約が公開されていない
4. **マーケティングページ不在**: features、pricing、aboutなどがない

### 現在のルート構造
```
/                    # アプリ本体（認証必須）
/auth/callback       # OAuth認証コールバック
/privacy            # プライバシーポリシー（認証必須）
/terms              # 利用規約（認証必須）
```

## 🎯 推奨ドメイン構造

### Option 1: 単一ドメイン構造（推奨）

```
tasktimeflow.com/
├── /                    # LP（マーケティングサイト）
├── /features            # 機能詳細ページ
├── /pricing             # 料金プランページ
├── /blog                # ブログ・SEOコンテンツ
├── /about               # 会社情報
├── /contact             # お問い合わせ
├── /privacy             # プライバシーポリシー（公開）
├── /terms               # 利用規約（公開）
├── /login               # ログインページ
├── /signup              # サインアップページ
└── /app                 # アプリケーション本体（認証必須）
    ├── /app/dashboard   # ダッシュボード
    ├── /app/workspace   # ワークスペース（現在の/）
    └── /app/settings    # 設定
```

**メリット**:
- SEO効果が集約される
- ドメインオーソリティが統一される
- 管理がシンプル
- SSL証明書が1つで済む
- ユーザー体験がスムーズ

### Option 2: サブドメイン構造

```
tasktimeflow.com         # LP・マーケティングサイト
app.tasktimeflow.com     # アプリケーション本体
api.tasktimeflow.com     # API（将来的に）
docs.tasktimeflow.com    # ドキュメント
blog.tasktimeflow.com    # ブログ
```

**メリット**:
- アプリとLPの完全分離
- 別々のデプロイサイクル
- セキュリティ面で隔離
- スケーリングが独立

## 📁 Next.js実装方法（Option 1）

### ディレクトリ構造

```
app/
├── (marketing)/              # マーケティング用ルートグループ
│   ├── layout.tsx           # マーケティング用レイアウト
│   ├── page.tsx             # LP トップページ
│   ├── features/page.tsx    # 機能紹介
│   ├── pricing/page.tsx     # 料金プラン
│   ├── about/page.tsx       # 会社情報
│   └── contact/page.tsx     # お問い合わせ
├── (legal)/                  # 法的ページ（常に公開）
│   ├── layout.tsx
│   ├── privacy/page.tsx
│   └── terms/page.tsx
├── (auth)/                   # 認証関連ページ
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── auth/callback/page.tsx
├── app/                      # アプリ本体（認証必須）
│   ├── layout.tsx           # AuthGuard適用
│   ├── workspace/page.tsx   # メインワークスペース
│   ├── dashboard/page.tsx   # ダッシュボード
│   └── settings/page.tsx    # 設定
└── layout.tsx               # ルートレイアウト（共通設定のみ）
```

### middleware.ts の実装

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createClient(request, response)
  const { data: { session } } = await supabase.auth.getSession()

  // /app/* は認証必須
  if (request.nextUrl.pathname.startsWith('/app')) {
    if (!session) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // 認証済みユーザーがログインページにアクセスした場合
  if (session && (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/signup'
  )) {
    return NextResponse.redirect(new URL('/app/workspace', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

## 🔧 移行計画

### Phase 1: ルートグループの導入（1週間）
1. `(marketing)`, `(legal)`, `(auth)`, `app/` ルートグループを作成
2. 既存のコンポーネントを適切なグループに移動
3. AuthGuardをapp/layout.tsxのみに限定

### Phase 2: マーケティングページ作成（2週間）
1. LPトップページの作成
2. Features、Pricing、Aboutページの作成
3. SEO最適化（メタタグ、構造化データ）

### Phase 3: 認証フロー改善（1週間）
1. 独立したログイン/サインアップページ
2. リダイレクトロジックの実装
3. 認証エラーハンドリング

### Phase 4: ドメイン設定（1日）
1. カスタムドメインの購入・設定
2. VercelでのDNS設定
3. SSL証明書の自動設定

## 🎯 SEO戦略

### マーケティングページ（/、/features、/pricing等）
- **indexable**: 検索エンジンにインデックスされる
- **構造化データ**: Organization、Product、FAQスキーマ
- **OGP対応**: ソーシャルメディア共有最適化
- **サイトマップ**: 動的生成

### アプリページ（/app/*）
- **noindex**: 検索結果から除外
- **認証必須**: ユーザーデータ保護
- **高速SPA**: クライアントサイドルーティング

## 📈 パフォーマンス最適化

### 静的生成（SSG）
- マーケティングページは静的生成
- 法的ページも静的生成
- ビルド時に最適化

### 動的レンダリング
- アプリ部分は動的
- リアルタイムデータ対応
- WebSocket接続

## 🔒 セキュリティ考慮事項

1. **CORS設定**: APIアクセスの制限
2. **CSP**: Content Security Policy
3. **認証トークン**: HTTPOnly Cookie
4. **レート制限**: DDoS対策

## 📝 実装チェックリスト

- [ ] ルートグループの作成
- [ ] middleware.tsの実装
- [ ] AuthGuardの移動（app/のみ）
- [ ] マーケティングlayoutの作成
- [ ] LPトップページの作成
- [ ] 各種マーケティングページ作成
- [ ] SEOメタデータの設定
- [ ] サイトマップ生成
- [ ] ドメイン購入・設定
- [ ] Vercelでのドメイン設定
- [ ] 本番環境でのテスト