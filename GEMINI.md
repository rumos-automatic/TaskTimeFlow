# GEMINI.md

This file provides guidance to Gemini when collaborating with Claude Code on the TaskTimeFlow project.

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

## Business Model

### Pricing Tiers
- **Free**: Basic features, 5 projects/month
- **Personal**: $9.99/month (unlimited tasks, Google sync)
- **Pro**: $19.99/month (AI features, advanced analytics)
- **Team**: $49.99/month (5 users, team features)
- **Enterprise**: Custom pricing

### Success Metrics
- **DAU/MAU**: 40%+ target
- **Task Completion Rate**: 70%+ target
- **6-month Retention**: 60%+ target

## Claude Code 連携ガイド

### 目的
Claude から **Gemini CLI** が呼び出された際に、
Gemini は Claude との対話コンテキストを保ちながら、複数ターンに渡り協働する。

---

### 役割分担
- 実装はClaude codeが行い、Geminiは相談のみとする。

---

### Claude Code の使い方
- ターミナルで以下を実行すると Claude と対話できる。
```bash
Claude <<EOF
<質問・依頼内容>
EOF
```