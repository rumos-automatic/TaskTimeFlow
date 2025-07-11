# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TaskTimeFlow is a next-generation task management SaaS that combines innovative 3-screen UI (Task Pool × Timeline × Focus) with complete Google Calendar/Tasks integration. It solves the problem of tasks piling up without execution by implementing timeboxing and Kanban fusion.

**Core Concept**: "Drag & drop task cards to timeline, sync with Google Calendar/Tasks for the ultimate timeboxing task management app"

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Shadcn/UI
- **Backend**: Supabase (BaaS) + Vercel Edge Functions
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth with Google OAuth
- **Real-time**: Supabase Realtime (WebSocket)
- **Hosting**: Vercel (Global CDN)
- **AI Integration**: OpenAI GPT-4, Claude, Google Gemini (Edge APIs)

## Development Commands (Once initialized)

```bash
# Install dependencies
npm install

# Development
npm run dev           # Run development server
npm run build         # Build for production
npm run start         # Start production server

# Testing
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:e2e      # E2E tests only

# Linting & Formatting
npm run lint          # Run ESLint
npm run format        # Run Prettier

# Database (Supabase)
npm run db:push       # Push schema changes
npm run db:migrate    # Run migrations
npm run db:studio     # Open database studio
```

## Important Development Notes

**⚠️ TESTING WORKFLOW**
- 開発サーバーでの動作確認は不要です
- ビルドテストが成功したら、直接プッシュしてください
- 本番環境のテストはVercelで直接行います
- 「開発サーバーで動作確認をお願いします」などの提案は不要です

**⚠️ PUSH前の必須チェック**
- `npm run build` でビルドエラーがないことを確認
- `npx next lint` でESLintエラーがないことを確認
- `npx tsc --noEmit` でTypeScriptエラーがないことを確認
- **これらのチェックをせずにpushすることは厳禁です**

## Core Features - Revolutionary 3-Screen UI

### 1. Task Pool Screen (Left)
- Google Tasks integration with real-time sync
- Category tabs (Work/Personal/Custom)
- Priority-based color coding (High:Red, Med:Yellow, Low:Green)
- Draggable task cards with sync indicators
- Voice input support for new tasks

### 2. Timeline/Calendar Screen (Center)
- **Timeline View**: Daily time axis display (1-hour units)
- **Calendar View**: Weekly/Monthly view switching
- Google Calendar bi-directional sync
- Visual highlighting of available time slots
- Drag & drop task placement with time-slot magnets
- Distinct display for Events (purple) vs Tasks (blue)

### 3. Focus Screen (Right)
- Pomodoro timer (25min/customizable)
- Progress ring visualization
- Task statistics (completed/remaining)
- Current/next task display
- Gradient background for focus mode

## Advanced Operation Experience

### PC Version
- Tab/Split view mode switching
- 3-finger trackpad swipe support
- Mouse wheel support for smooth scrolling

### Mobile Version
- Horizontal swipe for screen switching
- Edge-pull (cross-screen drag & drop)
- Haptic feedback
- One-handed operation optimization

## Smart Features

- **Quick Dock**: Always display top 3 frequently used tasks
- **Timeboxing**: Auto-suggest tasks for available time slots
- **Context Aware**: Prioritize short tasks during travel time

## Architecture Notes

- **State Management**: Zustand for client state, TanStack Query for server state
- **Real-time Sync**: Supabase Realtime for live updates
- **Optimistic UI**: Instant updates with error rollback
- **Theme System**: Multiple themes including glassmorphism
- **PWA Support**: Offline functionality for basic features

## Google API Integration

- **Scopes**: Calendar, Tasks, UserInfo
- **Sync Strategy**: Bi-directional real-time synchronization
- **Conflict Resolution**: Smart merge strategies
- **Rate Limiting**: Queue management with retry logic
- **Duplicate Prevention**: Sync IDs and checksum validation

## Development Phases (Updated Priority)

### Phase 1: MVP (3 months) - ✅ Core features completed
- **Month 1**: Infrastructure, authentication basics
- **Month 2**: 3-screen UI implementation, drag & drop
- **Month 3**: Basic functionality, UI polish

### Phase 1.5: Route Restructuring & Marketing Foundation (2 weeks) - 🚧 CURRENT PRIORITY
- **Week 1**: Route structure refactoring (public vs authenticated pages)
- **Week 2**: Landing page and marketing pages development
- **Reason**: Essential for user acquisition and monetization strategy

### Phase 2: Google Integration (3 weeks) - 📅 NEXT
- **Week 3-5**: Google Calendar/Tasks API integration
- Complete bi-directional sync implementation

### Phase 3: Pro Features (3 months)
- **Month 4-5**: Multi-AI integration (GPT-4, Claude, Gemini)
- **Month 6**: Analytics, advanced integrations

### Phase 4: Enterprise (6 months)
- **Month 7-12**: Team features, B2B functionality

## Business Model

### Pricing Tiers
- **Free**: Basic features, 5 projects/month (広告表示あり)
- **Personal**: $9.99/month (広告非表示、unlimited tasks, Google sync)
- **Pro**: $19.99/month (広告非表示、AI features, advanced analytics)
- **Team**: $49.99/month (広告非表示、5 users, team features)
- **Enterprise**: Custom pricing (広告非表示)

### 広告収益化戦略 (Ad Monetization Strategy)
- **Google AdSense導入**: 無料プランユーザーに対して非侵襲的な広告を表示
  - バナー広告: ヘッダー下部、フッター上部に配置
  - サイドバー広告: タスクプール画面の下部に配置（作業を妨げない位置）
  - インタースティシャル広告: セッション終了時のみ（ユーザー体験を損なわない）
- **広告配置の原則**:
  - タスク管理の作業フローを妨げない
  - フォーカスモード中は広告非表示
  - モバイル版では最小限の広告表示
- **収益モデル**:
  - 無料ユーザーの広告収益でサーバーコストをカバー
  - 有料プランへのアップグレードインセンティブとして広告非表示を提供
- **プライバシー対応**:
  - プライバシーポリシーページを実装済み
  - 利用規約ページを実装済み
  - GDPR/CCPA準拠の同意管理を将来的に実装予定

### Success Metrics
- **DAU/MAU**: 40%+ target
- **Task Completion Rate**: 70%+ target
- **6-month Retention**: 60%+ target

## Future Features (Roadmap)

### 🔧 Route Restructuring (Critical) - NEXT PRIORITY
- **Current Issue**: All pages require authentication (no public landing page)
- **Goal**: Separate public pages (LP, pricing, features) from authenticated app
- **Implementation**:
  - Introduce route groups: `(marketing)`, `(legal)`, `(auth)`, `app/`
  - Move AuthGuard to only protect `/app/*` routes
  - Implement middleware.ts for authentication control
  - Create public landing page at root `/`
  - Move workspace to `/app/workspace`
- **Benefits**:
  - SEO optimization for marketing pages
  - Better user acquisition funnel
  - Cleaner URL structure
  - Improved conversion rates
- **Reference**: `/docs/domain-routing-strategy.md`

### 💰 Advertisement Integration (Free Plan) - PLANNED
- **Google AdSense実装**: 
  - 環境変数での AdSense Client ID 管理
  - 広告コンポーネントの開発（GoogleAdSense, AdPlaceholder）
  - ユーザーのサブスクリプションステータスに基づく条件付き表示
  - 開発環境でのプレースホルダー広告表示
- **広告位置の最適化**:
  - A/Bテストによる最適な広告配置の検証
  - ユーザーエンゲージメントと収益のバランス調整
- **実装予定時期**: Phase 1後期〜Phase 2初期

### 🤖 AI Task Assistant (Pro Feature) - PLANNED

#### Core AI Features
- **Natural Language Processing**: Convert natural language to structured tasks
  - Example: "明日の会議の準備" → Category: Work, Priority: High, Time: 30min
- **Smart Time Estimation**: Predict task duration based on historical data
- **Optimal Scheduling**: AI suggests best time slots for tasks
- **Task Clustering**: Group similar tasks for batch processing
- **Daily Planning Assistant**: Morning AI briefing with optimized schedule

#### 🆕 Interactive AI Features (Future Implementation)
- **AI Chat Interface**: Conversational task creation through chat
  - Natural dialogue: "I need to prepare for tomorrow's presentation"
  - AI asks clarifying questions and creates structured tasks
  - Context-aware suggestions based on user's existing tasks and schedule
- **Screenshot Task Generation**: Image-to-task conversion
  - Upload screenshots (emails, documents, meeting notes, etc.)
  - AI reads and extracts actionable items automatically
  - Creates multiple related tasks with appropriate categorization and scheduling
  - Supports text extraction from images, PDFs, and documents

#### LLM Integration Architecture
- **User-Configurable LLM APIs**: 
  - Settings panel for API key management (OpenAI, Anthropic Claude, Google Gemini)
  - Encrypted storage of API keys in database with user-level encryption
  - Fallback model support and cost tracking per user
- **Privacy-First Design**: User data never sent to third-party services without explicit consent
- **Integration**: OpenAI GPT-4, Claude, Google Gemini via Edge APIs

### 🚀 Landing Page (Marketing Site) - PLANNED

#### Purpose & Goals
- **Conversion Optimization**: 無料プランへの登録促進、有料プランへのアップグレード促進
- **Value Proposition**: TaskTimeFlowの革新的な3画面UIとGoogle統合の価値を効果的に伝える
- **SEO Strategy**: オーガニック流入の増加とブランド認知度向上

#### Key Sections
- **Hero Section**: 
  - キャッチコピー: "タスクが溜まらない、時間に追われない。革新的な3画面UIでタスク管理を再定義"
  - メインCTA: "無料で始める" / "デモを見る"
  - ヒーロー画像/動画: 3画面UIの実際の操作イメージ
- **Features Section**:
  - 3画面UI（タスクプール×タイムライン×フォーカス）の詳細説明
  - Google Calendar/Tasks完全統合の説明
  - ドラッグ&ドロップの直感的操作のデモ
- **Pricing Section**:
  - 料金プランの比較表（Free/Personal/Pro/Team）
  - 広告表示有無の明確な説明
  - よくある質問（FAQ）の統合
- **Social Proof**:
  - ユーザーレビュー・評価
  - 導入企業ロゴ（将来的に）
  - 利用統計（タスク完了率70%以上など）
- **CTA Section**:
  - メールマガジン登録
  - 無料プラン登録への導線
  - お問い合わせフォーム

#### Technical Implementation
- **Framework**: Next.js（メインアプリと同じ）でSSG/ISR対応
- **Performance**: Lighthouse Score 95+を目指す
- **Analytics**: Google Analytics 4 + Tag Manager実装
- **A/B Testing**: 複数のCTAバリエーションをテスト
- **実装予定時期**: Phase 4後期〜Phase 5

## Important Files

- `/docs/requirements.md` - Detailed requirements and specifications
- `/docs/system-design.md` - System architecture and design
- `/docs/tech-stack-decision.md` - Technology choices and rationale
- `/docs/ui-design-concept.md` - UI/UX design concepts
- `/docs/development-roadmap.md` - Development timeline and milestones
- `/docs/database-schema.md` - Database schema and data models
- `/docs/api-specification.md` - API endpoints and specifications
- `/docs/auth-architecture.md` - Authentication and authorization design
- `/docs/domain-routing-strategy.md` - Domain structure and routing strategy

## Development Best Practices

### スクロール位置計算の注意点
タイムラインやカレンダーなど、スクロール位置を計算する際は以下に注意：

1. **動的コンテンツを考慮する**
   - Due Tasksセクションなど、条件によって表示される要素の高さを考慮
   - `querySelector`を使用して実際の要素サイズを取得
   - 例: `const dueSectionElement = container.querySelector('.bg-orange-50')`

2. **スペーシングを忘れない**
   - Tailwindの`space-y-*`クラスによるマージンを計算に含める
   - 例: `space-y-4`は16pxのマージン

3. **モバイルとPCで異なる処理**
   - モバイルでは二重スクロールコンテナ問題に注意
   - 親コンテナと子コンテナのどちらを使用するか明確にする

4. **初回ロード時のタイミング**
   - DOM要素が確実にレンダリングされてからスクロール計算を行う
   - 必要に応じてリトライロジックを実装

### テスト時の確認ポイント
- [ ] モバイルとPCの両方で動作確認
- [ ] 動的コンテンツ（Due Tasksなど）の有無による動作確認
- [ ] 初回ロード時とリロード時の両方で確認
- [ ] ビュー切り替え時の動作確認

## Gemini CLI 連携ガイド

### 目的
ユーザーが **「Geminiと相談しながら進めて」** （または類似表現）と指示した場合、
Claude は **Gemini CLI** を随時呼び出しながら、複数ターンにわたる協業を行う。

---

### トリガー
- 正規表現: `/Gemini.*相談しながら/`
- 一度トリガーした後は、ユーザーが明示的に終了を指示するまで **協業モード** を維持する。

---

### 協業ワークフロー (ループ可)
| # | 処理 | 詳細 |
|---|------|------|
| 1 | **PROMPT 準備** | 最新のユーザー要件 + これまでの議論要約を `$PROMPT` に格納 |
| 2 | **Gemini 呼び出し** | ```bash\ngemini <<EOF\n$PROMPT\nEOF\n```<br>必要に応じ `--max_output_tokens` 等を追加 |
| 3 | **出力貼り付け** | `Gemini ➜` セクションに全文、長い場合は要約＋原文リンク |
| 4 | **Claude コメント** | `Claude ➜` セクションで Gemini の提案を分析・統合し、次アクションを提示 |
| 5 | **継続判定** | ユーザー入力 or プラン継続で 1〜4 を繰り返す。<br>「Geminiコラボ終了」「ひとまずOK」等で通常モード復帰 |

---

### 形式テンプレート
```md
**Gemini ➜**
<Gemini からの応答>

**Claude ➜**
<統合コメント & 次アクション>
```