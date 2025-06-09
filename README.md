# TaskTimeFlow 🚀

> **かんばん方式とタイムラインを統合した革新的生産性向上SaaS**

TaskTimeFlowは、従来のプロジェクト管理ツールの枠を超えた次世代生産性向上アプリケーションです。かんばんボードと24時間連続タイムラインの革新的な統合により、タスク管理と時間管理を一元化し、個人・チームの生産性を最大化します。

![TaskTimeFlow](https://img.shields.io/badge/TaskTimeFlow-Production%20Ready-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Supabase](https://img.shields.io/badge/Supabase-Ready-green)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black)

## ✨ 主要機能

### 🎯 **統合ワークスペース**
- **デュアルパネル構成**: かんばん + 24時間タイムラインの同時表示
- **クロスビュー連携**: ドラッグ&ドロップでシームレスなタスク移動
- **レスポンシブデザイン**: PC・タブレット・スマートフォン完全対応

### ⏰ **スマートタイムライン**
- **24時間連続表示**: ブロック分割のない革新的な時間管理
- **エネルギーレベル対応**: 時間帯別生産性を考慮した最適スケジューリング
- **現在時刻インジケーター**: リアルタイム進捗可視化

### 🤖 **AI支援機能**
- **マルチプロバイダー対応**: OpenAI GPT-4・Claude・Google Gemini
- **タスク分析**: 複雑なタスクの自動分解・優先度提案
- **スケジュール最適化**: 個人の生産性パターン学習による時間割提案

### 🔗 **Google連携**
- **双方向同期**: Google Calendar・Google Tasks完全連携
- **リアルタイム同期**: 複数デバイス間でのデータ同期
- **競合解決**: 自動マージによる整合性保証

### 🍅 **ポモドーロシステム**
- **統合タイマー**: タスクと連動した集中セッション管理
- **統計分析**: 生産性指標の可視化・改善提案
- **通知システム**: デスクトップ・ブラウザ通知対応

### 📊 **高度な分析**
- **生産性ダッシュボード**: 日・週・月次の詳細分析
- **予測分析**: AI による生産性予測・改善提案
- **カスタムレポート**: CSV・PDFエクスポート対応

## 🏗️ 技術アーキテクチャ

### **Turborepo モノレポ構成**
```
TaskTimeFlow/
├── apps/
│   ├── web/          # Next.js 14 フロントエンド
│   └── api/          # NestJS バックエンド
├── packages/
│   ├── ui/           # 共通UIコンポーネント
│   ├── types/        # TypeScript型定義
│   └── utils/        # 共通ユーティリティ
└── supabase/         # データベース・認証
```

### **技術スタック**

#### **フロントエンド**
- **Next.js 14** with App Router + TypeScript
- **Shadcn/UI** + Radix UI (アクセシビリティ対応)
- **TailwindCSS** (Glass Morphism デザイン)
- **Framer Motion** (スムーズアニメーション)
- **Zustand** + TanStack Query (状態管理)

#### **バックエンド**
- **Supabase** (PostgreSQL + Auth + Realtime)
- **NestJS** (高度なAPI機能)
- **Edge Functions** (サーバーレス処理)

#### **インフラ**
- **Vercel** (フロントエンド最適化ホスティング)
- **Railway** (バックエンドAPI)
- **Google Cloud Platform** (AI・データ分析)

#### **開発・運用**
- **Docker** + **docker-compose** (開発環境)
- **GitHub Actions** (CI/CD)
- **Storybook** (コンポーネントカタログ)
- **ESLint** + **Prettier** (コード品質)

## 🚀 クイックスタート

### **1. 環境要件**
```bash
Node.js: ≥18.0.0
npm: ≥8.0.0
Docker: ≥20.0.0 (オプション)
```

### **2. インストール**
```bash
# リポジトリクローン
git clone https://github.com/your-username/TaskTimeFlow.git
cd TaskTimeFlow

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.localファイルを編集してSupabase・Google・AI APIキーを設定
```

### **3. 開発環境起動**

#### **ローカル開発**
```bash
# Turborepo開発サーバー起動
npm run dev
```

#### **Docker開発環境**
```bash
# Docker開発環境起動
npm run docker:dev
# または
make dev
```

### **4. アクセス**
- **Web App**: http://localhost:3000
- **API**: http://localhost:3001
- **Storybook**: http://localhost:6006

## 📋 コマンドリファレンス

### **開発コマンド**
```bash
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm run lint         # ESLintチェック
npm run type-check   # TypeScriptチェック
npm run test         # テスト実行
npm run storybook    # Storybookサーバー起動
```

### **Dockerコマンド**
```bash
npm run docker:dev   # 開発環境起動
npm run docker:prod  # 本番環境起動
npm run docker:down  # 環境停止
npm run docker:clean # 環境完全削除
```

### **データベースコマンド**
```bash
npm run db:push      # Supabaseマイグレーション実行
npm run db:reset     # データベースリセット
npm run studio       # Supabase Studio起動
```

## 🔧 設定ガイド

### **環境変数**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google OAuth & APIs
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI Providers
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_claude_api_key
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Stripe (商用版)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### **Google OAuth設定**
1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクト作成
2. Calendar API・Tasks API有効化
3. OAuth 2.0認証情報作成
4. 承認済みリダイレクトURIに`http://localhost:3000/auth/google/callback`追加

### **Supabase設定**
1. [Supabase](https://supabase.com/)でプロジェクト作成
2. データベースマイグレーション実行: `npm run db:push`
3. Row Level Security (RLS) 有効化
4. Google OAuth Provider設定

## 📱 デプロイメント

### **Vercel (推奨)**
```bash
# Vercel CLI
npm i -g vercel
vercel --prod
```

### **Docker本番環境**
```bash
# 本番環境起動
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### **Railway API**
1. [Railway](https://railway.app/)でNestJS APIデプロイ
2. 環境変数設定
3. 自動デプロイ設定

## 🧪 テスト

```bash
# 全テスト実行
npm run test

# カバレッジ付きテスト
npm run test:coverage

# E2Eテスト
npm run test:e2e

# Lighthouseパフォーマンステスト
npm run lighthouse
```

## 📚 ドキュメント

- **[API仕様書](./docs/api-specification.md)** - REST API詳細仕様
- **[システム設計](./docs/system-design.md)** - アーキテクチャ詳細
- **[データベーススキーマ](./docs/database-schema.md)** - DB設計仕様
- **[認証アーキテクチャ](./docs/auth-architecture.md)** - 認証システム詳細
- **[UI設計コンセプト](./docs/ui-design-concept.md)** - デザインシステム

## 🎨 デザインシステム

### **Glass Morphism**
```css
/* 基本ガラスモーフィズム */
.glass-card {
  @apply backdrop-blur-md bg-white/30 border border-white/20 shadow-xl;
}

/* カスタムCSS変数 */
:root {
  --tasktime-primary: 102 126 234;
  --tasktime-secondary: 118 75 162;
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
}
```

### **Storybook**
コンポーネントライブラリ: http://localhost:6006

## 🛠️ 開発ワークフロー

### **ブランチ戦略**
```
main           # 本番環境
├── develop    # 開発環境  
├── feature/*  # 機能開発
├── hotfix/*   # 緊急修正
└── release/*  # リリース準備
```

### **コミット規約**
```bash
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド・設定変更
```

## 📊 パフォーマンス

### **Lighthouse スコア目標**
- **Performance**: >90
- **Accessibility**: >95
- **Best Practices**: >90  
- **SEO**: >90
- **PWA**: >80

### **Core Web Vitals**
- **LCP**: <2.5s
- **FID**: <100ms
- **CLS**: <0.1

## 🔒 セキュリティ

- **Row Level Security (RLS)**: Supabaseデータアクセス制御
- **JWT Authentication**: 安全なトークンベース認証
- **API Rate Limiting**: DoS攻撃防止
- **HTTPS/TLS**: 全通信暗号化
- **CSP/CORS**: XSS・CSRF攻撃防止

## 🤝 貢献

1. Forkリポジトリ作成
2. Feature ブランチ作成: `git checkout -b feature/amazing-feature`
3. 変更コミット: `git commit -m 'feat: add amazing feature'`
4. ブランチプッシュ: `git push origin feature/amazing-feature`
5. Pull Request作成

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

## 🙏 謝辞

- **Vercel** - 最適化されたNext.jsホスティング
- **Supabase** - 高速BaaS・リアルタイム機能
- **Radix UI** - アクセシブルなプリミティブ
- **Tailwind CSS** - ユーティリティファーストCSS
- **OpenAI・Anthropic・Google** - AI機能提供

---

**TaskTimeFlow** で生産性の新次元を体験してください 🚀

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rumos-automatic/TaskTimeFlow)
[![Deploy to Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/rumos-automatic/TaskTimeFlow)