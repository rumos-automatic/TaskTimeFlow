# TaskTimeFlow API設計書

## 1. 概要

TaskTimeFlowは**Supabase**を基盤とした以下のAPI構成を採用します：

- **Supabase Auto REST API**: 基本的なCRUD操作
- **Supabase Edge Functions**: カスタムビジネスロジック・AI統合
- **Supabase Realtime**: リアルタイム機能
- **外部API統合**: Google Calendar/Tasks、AI プロバイダー

## 2. API基本仕様

### 2.1 ベースURL
```
Frontend (Vercel):
- Production: https://tasktimeflow.vercel.app
- Development: http://localhost:3000

Backend (Supabase):
- Production: https://your-project.supabase.co
- Development: http://localhost:54321
```

### 2.2 認証
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

### 2.3 レスポンス形式
```typescript
// 成功レスポンス
{
  "data": any,
  "message": string,
  "success": true
}

// エラーレスポンス
{
  "error": {
    "code": string,
    "message": string,
    "details": any
  },
  "success": false
}
```

## 3. 認証API

### 3.1 ユーザー登録
```typescript
POST /auth/v1/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "data": {
    "display_name": "田中太郎",
    "timezone": "Asia/Tokyo",
    "language": "ja"
  }
}

Response: {
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {...}
  }
}
```

### 3.2 ログイン
```typescript
POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### 3.3 Google OAuth
```typescript
POST /auth/v1/token?grant_type=oauth
Content-Type: application/json

{
  "provider": "google",
  "access_token": "google_access_token"
}
```

### 3.4 トークン更新
```typescript
POST /auth/v1/token?grant_type=refresh_token
Content-Type: application/json

{
  "refresh_token": "eyJ..."
}
```

## 4. ユーザー管理API

### 4.1 プロフィール取得
```typescript
GET /rest/v1/users?select=*&id=eq.{user_id}
Authorization: Bearer <token>

Response: {
  "data": [{
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "田中太郎",
    "avatar_url": "https://...",
    "subscription_tier": "pro",
    "notification_preferences": {...},
    "ai_preferences": {...}
  }]
}
```

### 4.2 プロフィール更新
```typescript
PATCH /rest/v1/users?id=eq.{user_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "display_name": "田中次郎",
  "timezone": "America/New_York",
  "notification_preferences": {
    "desktop": true,
    "sound": false,
    "email_digest": "weekly"
  }
}
```

### 4.3 ユーザー設定取得
```typescript
GET /rest/v1/user_settings?user_id=eq.{user_id}
Authorization: Bearer <token>

Response: {
  "data": [{
    "user_id": "uuid",
    "timeline_settings": {...},
    "notification_settings": {...},
    "ui_settings": {...},
    "productivity_settings": {...}
  }]
}
```

## 5. プロジェクト・タスク管理API

### 5.1 プロジェクト一覧取得
```typescript
GET /rest/v1/projects?select=*&order=updated_at.desc
Authorization: Bearer <token>

Response: {
  "data": [{
    "id": "uuid",
    "name": "WEBアプリ開発",
    "description": "TaskTimeFlow開発プロジェクト",
    "color": "#6366F1",
    "status": "active",
    "kanban_columns": [...],
    "created_at": "2024-06-08T10:00:00Z"
  }]
}
```

### 5.2 プロジェクト作成
```typescript
POST /rest/v1/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "新プロジェクト",
  "description": "プロジェクトの説明",
  "color": "#10B981",
  "kanban_columns": [
    {"id": "todo", "name": "ToDo", "icon": "📝", "order": 0},
    {"id": "doing", "name": "実行中", "icon": "🚀", "order": 1},
    {"id": "done", "name": "完了", "icon": "✅", "order": 2}
  ]
}
```

### 5.3 タスク一覧取得
```typescript
GET /rest/v1/tasks?select=*,assignee:users(display_name,avatar_url)&project_id=eq.{project_id}&order=position.asc
Authorization: Bearer <token>

Response: {
  "data": [{
    "id": "uuid",
    "title": "データベース設計",
    "description": "ユーザー・タスク管理のスキーマ設計",
    "status": "in_progress",
    "priority": "high",
    "estimated_duration": 120,
    "actual_duration": 85,
    "labels": ["backend", "database"],
    "context": "pc_required",
    "energy_level": "high",
    "assignee": {
      "display_name": "田中太郎",
      "avatar_url": "https://..."
    },
    "created_at": "2024-06-08T09:00:00Z"
  }]
}
```

### 5.4 タスク作成
```typescript
POST /rest/v1/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_id": "uuid",
  "title": "新しいタスク",
  "description": "タスクの詳細説明",
  "priority": "medium",
  "estimated_duration": 60,
  "labels": ["frontend", "ui"],
  "context": "anywhere",
  "energy_level": "medium"
}
```

### 5.5 タスクステータス更新
```typescript
PATCH /rest/v1/tasks?id=eq.{task_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed",
  "actual_duration": 75,
  "completed_at": "2024-06-08T12:30:00Z"
}
```

### 5.6 タスク位置更新（ドラッグ&ドロップ）
```typescript
POST /functions/v1/update-task-positions
Authorization: Bearer <token>
Content-Type: application/json

{
  "updates": [
    {
      "task_id": "uuid1",
      "status": "in_progress",
      "position": 0
    },
    {
      "task_id": "uuid2", 
      "status": "in_progress",
      "position": 1
    }
  ]
}
```

## 6. タイムライン管理API

### 6.1 タイムライン取得
```typescript
GET /rest/v1/timeline_slots?select=*,task:tasks(title,priority,labels)&user_id=eq.{user_id}&date=eq.2024-06-08&order=start_time.asc
Authorization: Bearer <token>

Response: {
  "data": [{
    "id": "uuid",
    "start_time": "2024-06-08T09:00:00Z",
    "end_time": "2024-06-08T10:30:00Z",
    "status": "in_progress",
    "actual_start_time": "2024-06-08T09:05:00Z",
    "task": {
      "title": "データベース設計",
      "priority": "high",
      "labels": ["backend"]
    },
    "google_calendar_event_id": "google_event_id"
  }]
}
```

### 6.2 タスクをタイムラインにスケジュール
```typescript
POST /rest/v1/timeline_slots
Authorization: Bearer <token>
Content-Type: application/json

{
  "task_id": "uuid",
  "start_time": "2024-06-08T14:00:00Z",
  "end_time": "2024-06-08T15:30:00Z",
  "status": "scheduled"
}
```

### 6.3 スマートスケジューリング
```typescript
POST /functions/v1/smart-schedule
Authorization: Bearer <token>
Content-Type: application/json

{
  "task_ids": ["uuid1", "uuid2", "uuid3"],
  "date_range": {
    "start": "2024-06-08",
    "end": "2024-06-12"
  },
  "preferences": {
    "prefer_morning": true,
    "avoid_low_energy": true,
    "consider_context": true
  }
}

Response: {
  "data": {
    "scheduled_slots": [{
      "task_id": "uuid1",
      "recommended_time": "2024-06-08T09:00:00Z",
      "duration": 90,
      "confidence_score": 0.85,
      "reasoning": "高エネルギー時間帯で集中力が必要なタスクに最適"
    }],
    "conflicts": [],
    "suggestions": [...]
  }
}
```

### 6.4 時間ブロック設定
```typescript
GET /rest/v1/time_blocks?user_id=eq.{user_id}&order=start_hour.asc
Authorization: Bearer <token>

POST /rest/v1/time_blocks
Authorization: Bearer <token>
Content-Type: application/json

{
  "start_hour": 9,
  "end_hour": 12,
  "label": "集中作業時間",
  "color": "#10B981",
  "energy_level": "high",
  "days_of_week": [1, 2, 3, 4, 5]
}
```

## 7. AI統合API

### 7.1 タスク分割AI
```typescript
POST /functions/v1/ai-task-split
Authorization: Bearer <token>
Content-Type: application/json

{
  "task_id": "uuid",
  "provider": "openai", // "openai", "claude", "gemini"
  "split_strategy": "time_based", // "time_based", "complexity_based", "feature_based"
  "target_duration": 60 // 分単位
}

Response: {
  "data": {
    "original_task": {
      "id": "uuid",
      "title": "プロジェクト企画書作成"
    },
    "split_tasks": [
      {
        "title": "要件整理・市場調査",
        "estimated_duration": 90,
        "priority": "high",
        "description": "競合分析と要件定義"
      },
      {
        "title": "技術選定・アーキテクチャ設計",
        "estimated_duration": 120,
        "priority": "high", 
        "description": "技術スタック決定と設計"
      },
      {
        "title": "企画書作成・レビュー",
        "estimated_duration": 60,
        "priority": "medium",
        "description": "ドキュメント作成と最終確認"
      }
    ],
    "reasoning": "タスクを論理的な工程に分割し、各ステップを順序立てて実行できるようにしました。",
    "total_estimated_time": 270
  }
}
```

### 7.2 スマート提案
```typescript
POST /functions/v1/ai-suggestions
Authorization: Bearer <token>
Content-Type: application/json

{
  "context": {
    "current_time": "2024-06-08T14:00:00Z",
    "available_time_slots": [
      {"start": "2024-06-08T15:00:00Z", "end": "2024-06-08T17:00:00Z", "energy_level": "medium"}
    ],
    "pending_tasks": ["uuid1", "uuid2", "uuid3"],
    "user_preferences": {
      "prefer_batch_similar": true,
      "energy_optimization": true
    }
  }
}

Response: {
  "data": {
    "suggestions": [
      {
        "type": "task_scheduling",
        "task_id": "uuid1",
        "recommended_slot": "2024-06-08T15:00:00Z",
        "reasoning": "中エネルギー時間帯でレビュー作業に適しています",
        "confidence": 0.8
      },
      {
        "type": "break_reminder",
        "message": "1時間以上作業されています。5分の休憩をお勧めします。",
        "priority": "medium"
      }
    ]
  }
}
```

### 7.3 生産性分析
```typescript
POST /functions/v1/ai-productivity-analysis
Authorization: Bearer <token>
Content-Type: application/json

{
  "period": "last_week", // "today", "last_week", "last_month"
  "analysis_type": "comprehensive" // "time_analysis", "task_analysis", "comprehensive"
}

Response: {
  "data": {
    "summary": {
      "completion_rate": 78,
      "efficiency_score": 85,
      "total_focus_time": 1260, // 分
      "peak_productivity_hours": ["09:00-11:00", "14:00-16:00"]
    },
    "insights": [
      {
        "type": "pattern",
        "title": "午前中の生産性が高い傾向",
        "description": "9-11時の完了率が90%と最も高く、この時間帯に重要タスクを配置することを推奨",
        "actionable": true
      }
    ],
    "recommendations": [
      {
        "title": "タスク時間の見積もり精度向上",
        "description": "平均20%長くかかっています。見積もり時間を1.2倍に調整することを推奨",
        "impact": "medium"
      }
    ]
  }
}
```

## 8. 分析・レポートAPI

### 8.1 ダッシュボード統計
```typescript
GET /rest/v1/rpc/get_dashboard_stats?user_id={user_id}
Authorization: Bearer <token>

Response: {
  "data": {
    "today": {
      "tasks_completed": 4,
      "completion_rate": 80,
      "focus_time_minutes": 240,
      "scheduled_tasks": 6
    },
    "week": {
      "avg_completion_rate": 75,
      "total_focus_time": 1200,
      "productivity_trend": "increasing"
    },
    "active_tasks_count": 12,
    "upcoming_deadlines": 3
  }
}
```

### 8.2 詳細分析データ
```typescript
GET /rest/v1/productivity_analytics?user_id=eq.{user_id}&date=gte.2024-06-01&date=lte.2024-06-08&order=date.asc
Authorization: Bearer <token>

Response: {
  "data": [{
    "date": "2024-06-08",
    "tasks_planned": 6,
    "tasks_completed": 5,
    "total_planned_minutes": 360,
    "total_actual_minutes": 380,
    "completion_rate": 83.33,
    "efficiency_score": 94.74,
    "pomodoro_sessions": 8,
    "pomodoro_completed": 7
  }]
}
```

### 8.3 エクスポート機能
```typescript
POST /functions/v1/export-data
Authorization: Bearer <token>
Content-Type: application/json

{
  "format": "json", // "json", "csv", "pdf"
  "data_types": ["tasks", "timeline", "analytics"],
  "date_range": {
    "start": "2024-06-01",
    "end": "2024-06-08"
  }
}

Response: {
  "data": {
    "download_url": "https://storage.supabase.co/object/public/exports/user_data_20240608.json",
    "expires_at": "2024-06-08T18:00:00Z",
    "file_size": 1024768
  }
}
```

## 9. 外部連携API

### 9.1 Google Calendar統合
```typescript
POST /functions/v1/integrations/google-calendar/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "sync_direction": "bidirectional", // "import", "export", "bidirectional"
  "date_range": {
    "start": "2024-06-08",
    "end": "2024-06-15"
  }
}

Response: {
  "data": {
    "sync_status": "completed",
    "imported_events": 12,
    "exported_events": 8,
    "conflicts": [
      {
        "task_id": "uuid",
        "calendar_event_id": "google_event_id",
        "conflict_type": "time_overlap",
        "resolution": "user_action_required"
      }
    ]
  }
}
```

### 9.2 連携設定管理
```typescript
GET /rest/v1/integrations?user_id=eq.{user_id}
Authorization: Bearer <token>

POST /rest/v1/integrations
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "google_calendar",
  "access_token_encrypted": "encrypted_token",
  "refresh_token_encrypted": "encrypted_refresh",
  "expires_at": "2024-07-08T10:00:00Z",
  "settings": {
    "calendar_id": "primary",
    "sync_frequency": "realtime",
    "default_event_color": "#6366F1"
  }
}
```

## 10. リアルタイム機能

### 10.1 Supabase Realtime設定
```typescript
// フロントエンド実装例
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

// タスク更新のリアルタイム監視
const channel = supabase
  .channel('task-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `project_id=eq.${projectId}`
    },
    (payload) => {
      console.log('Task updated:', payload)
      // UIを更新
      updateTaskInUI(payload.new)
    }
  )
  .subscribe()

// タイムライン更新の監視
const timelineChannel = supabase
  .channel('timeline-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'timeline_slots',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Timeline updated:', payload)
      updateTimelineInUI(payload.new)
    }
  )
  .subscribe()
```

### 10.2 チーム向けリアルタイム
```typescript
// チームプロジェクトの同期
const teamChannel = supabase
  .channel(`project:${projectId}`)
  .on('broadcast', { event: 'task-drag' }, (payload) => {
    // 他のユーザーのドラッグ操作を表示
    showOtherUserDragging(payload)
  })
  .on('broadcast', { event: 'user-online' }, (payload) => {
    // オンラインユーザー表示更新
    updateOnlineUsers(payload)
  })
  .subscribe()

// ブロードキャスト送信
const broadcastTaskDrag = (taskId: string, position: {x: number, y: number}) => {
  teamChannel.send({
    type: 'broadcast',
    event: 'task-drag',
    payload: { taskId, position, userId: currentUserId }
  })
}
```

## 11. エラーハンドリング

### 11.1 標準エラーコード
```typescript
enum APIErrorCode {
  // 認証エラー
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // リソースエラー
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // バリデーションエラー
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // ビジネスロジックエラー
  TIME_CONFLICT = 'TIME_CONFLICT',
  SUBSCRIPTION_LIMIT = 'SUBSCRIPTION_LIMIT',
  AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',
  
  // システムエラー
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}
```

### 11.2 エラーレスポンス例
```typescript
// バリデーションエラー
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力データに問題があります",
    "details": {
      "field": "estimated_duration",
      "constraint": "must be between 1 and 480 minutes"
    }
  },
  "success": false
}

// 時間競合エラー
{
  "error": {
    "code": "TIME_CONFLICT",
    "message": "指定した時間帯に既に予定があります",
    "details": {
      "conflicting_slot": {
        "id": "uuid",
        "start_time": "2024-06-08T14:00:00Z",
        "end_time": "2024-06-08T15:30:00Z",
        "task_title": "既存のタスク"
      }
    }
  },
  "success": false
}
```

## 12. レート制限

### 12.1 API制限
```typescript
// プラン別API制限（1時間あたり）
const RATE_LIMITS = {
  free: {
    api_requests: 1000,
    ai_requests: 10,
    realtime_connections: 2
  },
  personal: {
    api_requests: 5000,
    ai_requests: 100,
    realtime_connections: 5
  },
  pro: {
    api_requests: 20000,
    ai_requests: 500,
    realtime_connections: 10
  },
  enterprise: {
    api_requests: 100000,
    ai_requests: 2000,
    realtime_connections: 50
  }
}
```

### 12.2 制限超過レスポンス
```typescript
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API利用制限を超過しました",
    "details": {
      "limit": 1000,
      "used": 1001,
      "reset_at": "2024-06-08T15:00:00Z",
      "upgrade_url": "https://tasktimeflow.com/upgrade"
    }
  },
  "success": false
}
```

このAPI設計により、TaskTimeFlowの全機能を効率的かつ安全に提供できる包括的なAPIエコシステムが構築できます。