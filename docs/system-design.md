# TaskTimeFlow システム設計書

## 1. システムアーキテクチャ

### 1.1 全体構成
```
┌─────────────────────────────────────────────────────────────┐
│                         クライアント層                         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  React SPA + Redux/Zustand                           │  │
│  │  - かんばんボード UI                                  │  │
│  │  - タイムライン UI                                    │  │
│  │  - ポモドーロタイマー                                 │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                ↕
┌─────────────────────────────────────────────────────────────┐
│                          API層                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Node.js + Express/Fastify                          │  │
│  │  - RESTful API / GraphQL                           │  │
│  │  - WebSocket Server (リアルタイム同期)               │  │
│  │  - 認証ミドルウェア                                  │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                ↕
┌─────────────────────────────────────────────────────────────┐
│                        データ層                             │
│  ┌─────────────┬───────────────┬─────────────────────┐  │
│  │  PostgreSQL  │  Redis        │  外部API           │  │
│  │  - ユーザー   │  - セッション  │  - Google Calendar │  │
│  │  - タスク     │  - キャッシュ  │  - Google Tasks    │  │
│  │  - 同期情報   │  - リアルタイム │                   │  │
│  └─────────────┴───────────────┴─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技術スタック（推奨）

#### フロントエンド
- **フレームワーク**: React 18+ (TypeScript)
- **状態管理**: Zustand または Redux Toolkit
- **UI ライブラリ**: 
  - Tailwind CSS + shadcn/ui (カスタマイズ性重視)
  - または Material-UI v5 (開発速度重視)
- **ドラッグ&ドロップ**: react-beautiful-dnd または @dnd-kit
- **カレンダー**: FullCalendar または react-big-calendar
- **リアルタイム通信**: Socket.io-client

#### バックエンド
- **ランタイム**: Node.js 20+ (TypeScript)
- **フレームワーク**: Express.js または Fastify
- **認証**: Passport.js + JWT
- **ORM**: Prisma または TypeORM
- **リアルタイム**: Socket.io
- **ジョブキュー**: Bull (Redis ベース)

#### インフラ・デプロイ
- **ホスティング**: 
  - Vercel (フロントエンド)
  - Railway/Render (バックエンド)
  - または AWS/GCP
- **データベース**: Supabase または PlanetScale
- **キャッシュ**: Upstash Redis

## 2. データモデル

### 2.1 主要エンティティ

```typescript
// ユーザー
interface User {
  id: string;
  email: string;
  googleId: string;
  name: string;
  avatarUrl?: string;
  subscription: SubscriptionPlan;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

// タスク
interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus; // 'todo' | 'in_progress' | 'review' | 'done'
  priority: Priority; // 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: Date;
  estimatedMinutes?: number;
  actualMinutes?: number;
  labels: Label[];
  
  // かんばん関連
  boardColumnId: string;
  position: number;
  
  // タイムライン関連
  scheduledStart?: Date;
  scheduledEnd?: Date;
  
  // Google連携
  googleTaskId?: string;
  googleCalendarEventId?: string;
  lastSyncedAt?: Date;
  syncVersion: number; // 楽観的同期用
  
  createdAt: Date;
  updatedAt: Date;
}

// ポモドーロセッション
interface PomodoroSession {
  id: string;
  taskId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // 分
  type: 'work' | 'short_break' | 'long_break';
  completed: boolean;
}

// タスクログ（完了履歴）
interface TaskLog {
  id: string;
  taskId: string;
  userId: string;
  action: 'created' | 'started' | 'paused' | 'completed' | 'moved_to_timeline' | 'moved_to_kanban';
  timestamp: Date;
  metadata?: {
    fromStatus?: TaskStatus;
    toStatus?: TaskStatus;
    scheduledTime?: Date;
    completionNote?: string;
    actualDuration?: number;
  };
}

// 分析データ（集計用）
interface DailyStats {
  id: string;
  userId: string;
  date: Date;
  tasksCompleted: number;
  totalWorkTime: number; // 分
  pomodoroSessions: number;
  avgTaskDuration: number;
  productivityScore: number;
}

// 同期メタデータ
interface SyncMetadata {
  id: string;
  userId: string;
  entityType: 'task' | 'event';
  localId: string;
  googleId: string;
  lastLocalUpdate: Date;
  lastGoogleUpdate: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
}
```

### 2.2 データベーススキーマ

```sql
-- ユーザーテーブル
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  subscription_plan VARCHAR(50) DEFAULT 'free',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- タスクテーブル
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL,
  priority VARCHAR(50) NOT NULL,
  due_date TIMESTAMPTZ,
  estimated_minutes INTEGER,
  actual_minutes INTEGER DEFAULT 0,
  board_column_id UUID,
  position INTEGER,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  google_task_id VARCHAR(255),
  google_calendar_event_id VARCHAR(255),
  last_synced_at TIMESTAMPTZ,
  sync_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_google_ids ON tasks(google_task_id, google_calendar_event_id);
```

## 3. Google API 連携設計

### 3.1 認証フロー
```
1. ユーザーが「Googleでログイン」をクリック
2. Google OAuth 2.0 認証画面へリダイレクト
3. 必要なスコープ:
   - https://www.googleapis.com/auth/calendar
   - https://www.googleapis.com/auth/tasks
   - https://www.googleapis.com/auth/userinfo.profile
4. 認証成功後、アクセストークンとリフレッシュトークンを取得
5. トークンを暗号化してデータベースに保存
```

### 3.2 同期戦略

#### 重複防止の仕組み
1. **一意識別子の管理**
   - 各タスクに内部ID + Google ID をマッピング
   - sync_metadata テーブルで関連を管理

2. **バージョン管理**
   - 楽観的ロックによる競合検出
   - タイムスタンプベースの変更追跡

3. **同期フロー**
```typescript
// 同期アルゴリズム（擬似コード）
async function syncTask(task: Task) {
  const metadata = await getSyncMetadata(task.id);
  
  // 1. ローカル変更をGoogleに反映
  if (task.updatedAt > metadata.lastLocalUpdate) {
    await updateGoogleTask(task);
    await updateGoogleCalendarEvent(task);
  }
  
  // 2. Google側の変更を取得
  const googleChanges = await fetchGoogleChanges(metadata.lastGoogleUpdate);
  
  // 3. 競合解決
  if (hasConflict(task, googleChanges)) {
    // 最新の変更を優先（設定可能）
    const resolved = resolveConflict(task, googleChanges);
    await updateLocalTask(resolved);
  }
}
```

### 3.3 Webhook設計（Push通知）
Google Calendar API のPush通知を使用してリアルタイム同期を実現:

```typescript
// Webhook エンドポイント
app.post('/api/webhooks/google-calendar', async (req, res) => {
  const { resourceId, channelId } = req.headers;
  
  // 変更を検出してクライアントに通知
  const changes = await fetchCalendarChanges(resourceId);
  io.to(userId).emit('calendar-update', changes);
});
```

## 4. セキュリティ設計

### 4.1 認証・認可
- JWT トークンによるステートレス認証
- リフレッシュトークンの安全な管理
- CSRFトークンによる保護

### 4.2 データ保護
- Google トークンの暗号化保存
- HTTPSによる通信の暗号化
- XSS/SQLインジェクション対策

### 4.3 レート制限
- API エンドポイントごとのレート制限
- Google API のクォータ管理

## 5. クロスビュー機能設計

### 5.1 ドラッグ&ドロップアーキテクチャ
```typescript
// ドラッグ可能なアイテムの型定義
interface DragItem {
  type: 'TASK_CARD' | 'TIMELINE_EVENT';
  task: Task;
  source: 'kanban' | 'timeline';
  sourceId?: string; // カラムIDまたは時間枠ID
}

// ドロップターゲットの型定義
interface DropTarget {
  type: 'KANBAN_COLUMN' | 'TIMELINE_SLOT';
  accepts: ('TASK_CARD' | 'TIMELINE_EVENT')[];
  columnId?: string;
  timeSlot?: {
    start: Date;
    end: Date;
  };
}
```

### 5.2 クロスビュー同期ロジック
```typescript
// かんばん → タイムライン
const handleKanbanToTimelineDrop = async (task: Task, timeSlot: TimeSlot) => {
  // 1. タスクに時間情報を追加
  const updatedTask = {
    ...task,
    scheduledStart: timeSlot.start,
    scheduledEnd: timeSlot.end,
    status: task.status === 'todo' ? 'scheduled' : task.status
  };
  
  // 2. 楽観的UI更新
  updateLocalTask(updatedTask);
  
  // 3. サーバー同期
  await syncTaskUpdate(updatedTask);
  
  // 4. Google Calendar同期
  await syncWithGoogleCalendar(updatedTask);
};

// タイムライン → かんばん
const handleTimelineToKanbanDrop = async (task: Task, columnId: string) => {
  const updatedTask = {
    ...task,
    status: getStatusFromColumnId(columnId),
    scheduledStart: null,
    scheduledEnd: null
  };
  
  // 同様の同期処理
};
```

## 6. 分析・レポート機能設計

### 6.1 データ集計システム
```typescript
// 日次バッチ処理
const calculateDailyStats = async (userId: string, date: Date) => {
  const completedTasks = await getCompletedTasksForDate(userId, date);
  const pomodoroSessions = await getPomodoroSessionsForDate(userId, date);
  
  const stats: DailyStats = {
    userId,
    date,
    tasksCompleted: completedTasks.length,
    totalWorkTime: completedTasks.reduce((sum, task) => sum + task.actualMinutes, 0),
    pomodoroSessions: pomodoroSessions.filter(s => s.completed).length,
    avgTaskDuration: calculateAverage(completedTasks.map(t => t.actualMinutes)),
    productivityScore: calculateProductivityScore(completedTasks)
  };
  
  await saveDailyStats(stats);
};
```

### 6.2 分析クエリ最適化
```sql
-- 完了タスク一覧（インデックス最適化）
CREATE INDEX idx_tasks_completion ON tasks(user_id, status, updated_at) 
WHERE status = 'completed';

-- 日別統計用インデックス
CREATE INDEX idx_daily_stats_user_date ON daily_stats(user_id, date);

-- タスクログ用インデックス
CREATE INDEX idx_task_logs_user_timestamp ON task_logs(user_id, timestamp);
```

## 7. パフォーマンス最適化

### 7.1 キャッシュ戦略
- Redis によるセッションキャッシュ
- Google API レスポンスのキャッシュ
- クライアントサイドキャッシュ（Service Worker）
- 分析データの事前計算とキャッシュ

### 7.2 最適化技術
- データベースクエリの最適化
- ページネーション（完了タスク一覧）
- 遅延ローディング
- WebSocketによる差分更新
- 仮想スクロール（大量データ表示）

### 7.3 リアルタイム更新
```typescript
// WebSocketイベント設計
interface SocketEvents {
  'task:updated': Task;
  'task:moved': { taskId: string; from: string; to: string };
  'task:completed': Task;
  'stats:daily_update': DailyStats;
}
```

---

このシステム設計について、特に気になる点や詳細を詰めたい部分があれば教えてください！