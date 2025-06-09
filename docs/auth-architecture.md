# TaskTimeFlow 認証・認可アーキテクチャ設計書

## 1. 概要

TaskTimeFlowは**Supabase Auth**を基盤とした包括的な認証・認可システムを構築します。
商用SaaSとして、セキュリティ、スケーラビリティ、ユーザビリティを両立する設計を採用します。

## 2. 認証アーキテクチャ概要

### 2.1 全体構成
```
[クライアント] ← JWT → [Supabase Auth] ← RLS → [PostgreSQL]
      ↓                      ↓                      ↓
[Next.js App] ←→ [Edge Functions] ←→ [外部OAuth Provider]
      ↓                      ↓                      ↓
[ローカル状態]   [カスタムロジック]    [Google/SSO]
```

### 2.2 主要コンポーネント
- **Supabase Auth**: 認証エンジン
- **JWT Token**: セッション管理
- **Row Level Security (RLS)**: データアクセス制御
- **OAuth Providers**: 外部認証連携
- **多要素認証 (MFA)**: セキュリティ強化
- **RBAC**: ロールベースアクセス制御

## 3. Supabase Auth設定

### 3.1 基本設定
```sql
-- Supabase プロジェクト設定
-- Auth Configuration
{
  "JWT_EXPIRY": 3600,           -- 1時間
  "REFRESH_TOKEN_ROTATION": true,
  "PASSWORD_MIN_LENGTH": 8,
  "SIGN_UP_ENABLED": true,
  "EMAIL_CONFIRM_ENABLED": true,
  "EMAIL_DOUBLE_CONFIRM_ENABLED": false,
  "MFA_MAX_ENROLLED_FACTORS": 10
}
```

### 3.2 認証フロー設定
```typescript
// Next.js環境変数
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

// Auth設定
SUPABASE_JWT_SECRET=your-jwt-secret
SITE_URL=https://tasktimeflow.com
REDIRECT_URLS=https://tasktimeflow.com/auth/callback,http://localhost:3000/auth/callback
```

### 3.3 カスタムクレーム設定
```sql
-- JWT カスタムクレーム用関数
CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_role text;
  user_subscription text;
  organization_ids uuid[];
BEGIN
  -- 基本クレーム取得
  claims := event->'claims';
  
  -- ユーザー情報取得
  SELECT 
    subscription_tier,
    COALESCE(
      array_agg(DISTINCT om.organization_id) FILTER (WHERE om.organization_id IS NOT NULL),
      '{}'::uuid[]
    )
  INTO user_subscription, organization_ids
  FROM users u
  LEFT JOIN organization_members om ON u.id = om.user_id
  WHERE u.id = (event->>'user_id')::uuid
  GROUP BY u.subscription_tier;
  
  -- カスタムクレーム追加
  claims := jsonb_set(claims, '{subscription_tier}', to_jsonb(user_subscription));
  claims := jsonb_set(claims, '{organization_ids}', to_jsonb(organization_ids));
  claims := jsonb_set(claims, '{app_metadata}', jsonb_build_object(
    'provider', event->'user'->'app_metadata'->>'provider',
    'providers', event->'user'->'app_metadata'->'providers'
  ));
  
  -- イベント更新
  event := jsonb_set(event, '{claims}', claims);
  
  RETURN event;
END;
$$;

-- フック登録
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook TO postgres;
```

## 4. OAuth統合設定

### 4.1 Google OAuth設定
```typescript
// Supabase Dashboard設定
{
  "provider": "google",
  "enabled": true,
  "client_id": "your-google-client-id.googleusercontent.com",
  "client_secret": "your-google-client-secret",
  "redirect_url": "https://your-project.supabase.co/auth/v1/callback",
  "scopes": "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks"
}
```

### 4.2 Google Calendar/Tasks API統合
```typescript
// OAuth フロー実装
export async function initiateGoogleOAuth(service: 'calendar' | 'tasks') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: service === 'calendar' 
        ? 'openid email profile https://www.googleapis.com/auth/calendar'
        : 'openid email profile https://www.googleapis.com/auth/tasks',
      redirectTo: `${window.location.origin}/auth/callback?service=${service}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
  
  return { data, error };
}

// トークン保存・更新
export async function saveGoogleTokens(
  userId: string, 
  service: string, 
  tokens: GoogleTokens
) {
  const { data, error } = await supabase
    .from('integrations')
    .upsert({
      user_id: userId,
      provider: service,
      access_token_encrypted: await encrypt(tokens.access_token),
      refresh_token_encrypted: tokens.refresh_token ? await encrypt(tokens.refresh_token) : null,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      settings: {
        scope: tokens.scope,
        token_type: tokens.token_type
      }
    });
    
  return { data, error };
}
```

### 4.3 Enterprise SSO (SAML)
```typescript
// エンタープライズ向けSAML設定
{
  "provider": "saml",
  "enabled": true,
  "metadata_url": "https://company.okta.com/app/metadata",
  "entity_id": "tasktimeflow-production",
  "assertion_consumer_service_url": "https://your-project.supabase.co/auth/v1/sso/saml/acs",
  "single_logout_url": "https://your-project.supabase.co/auth/v1/sso/saml/sls",
  "attribute_mapping": {
    "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
    "department": "http://schemas.microsoft.com/ws/2008/06/identity/claims/department"
  }
}
```

## 5. JWT管理・セッション制御

### 5.1 トークンライフサイクル
```typescript
// トークン設定
const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRES: '1h',
  REFRESH_TOKEN_EXPIRES: '30d',
  REFRESH_TOKEN_ROTATION: true,
  REUSE_INTERVAL: 10 // 秒
};

// 自動リフレッシュ実装
export class AuthManager {
  private refreshTimer: NodeJS.Timeout | null = null;
  
  constructor(private supabase: SupabaseClient) {
    this.setupAutoRefresh();
  }
  
  private setupAutoRefresh() {
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.scheduleRefresh(session);
      } else if (event === 'SIGNED_OUT') {
        this.clearRefreshTimer();
      }
    });
  }
  
  private scheduleRefresh(session: Session) {
    this.clearRefreshTimer();
    
    const expiresAt = session.expires_at * 1000;
    const refreshAt = expiresAt - (5 * 60 * 1000); // 5分前
    const delay = refreshAt - Date.now();
    
    if (delay > 0) {
      this.refreshTimer = setTimeout(async () => {
        await this.supabase.auth.refreshSession();
      }, delay);
    }
  }
  
  private clearRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
```

### 5.2 セッション管理
```typescript
// セキュアセッション管理
export class SecureSessionManager {
  private static readonly SESSION_KEY = 'supabase.auth.token';
  private static readonly FINGERPRINT_KEY = 'device.fingerprint';
  
  // デバイスフィンガープリント生成
  static async generateFingerprint(): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('TaskTimeFlow', 10, 10);
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${screen.width}x${screen.height}`,
      canvas: canvas.toDataURL()
    };
    
    return btoa(JSON.stringify(fingerprint));
  }
  
  // セッション検証
  static async validateSession(session: Session): Promise<boolean> {
    const storedFingerprint = localStorage.getItem(this.FINGERPRINT_KEY);
    const currentFingerprint = await this.generateFingerprint();
    
    // フィンガープリント検証
    if (storedFingerprint && storedFingerprint !== currentFingerprint) {
      console.warn('Device fingerprint mismatch');
      return false;
    }
    
    // JWT有効性検証
    const { data, error } = await supabase.auth.getUser();
    return !error && !!data.user;
  }
}
```

## 6. Row Level Security (RLS) ポリシー

### 6.1 基本ポリシー設計
```sql
-- ユーザーデータアクセス制御
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (auth.uid() = id);

-- プロジェクトアクセス制御（組織メンバーシップ考慮）
CREATE POLICY "project_access_control" ON projects
  FOR ALL USING (
    -- 個人プロジェクト
    (organization_id IS NULL AND owner_id = auth.uid()) OR
    -- 組織プロジェクト（メンバーのみ）
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = projects.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'member')
    ))
  );

-- タスクアクセス制御
CREATE POLICY "task_access_control" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id AND (
        -- プロジェクトオーナー
        p.owner_id = auth.uid() OR
        -- 組織メンバー
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = p.organization_id
            AND om.user_id = auth.uid()
        ) OR
        -- タスク担当者
        tasks.assignee_id = auth.uid()
      )
    )
  );
```

### 6.2 サブスクリプション制限ポリシー
```sql
-- プロジェクト数制限
CREATE POLICY "project_count_limit" ON projects
  FOR INSERT WITH CHECK (
    CASE 
      WHEN (auth.jwt() ->> 'subscription_tier') = 'free' THEN
        (SELECT COUNT(*) FROM projects WHERE owner_id = auth.uid()) < 3
      WHEN (auth.jwt() ->> 'subscription_tier') = 'personal' THEN
        (SELECT COUNT(*) FROM projects WHERE owner_id = auth.uid()) < 10
      ELSE TRUE
    END
  );

-- AI使用量制限
CREATE POLICY "ai_usage_limit" ON ai_sessions
  FOR INSERT WITH CHECK (
    CASE 
      WHEN (auth.jwt() ->> 'subscription_tier') = 'free' THEN
        (SELECT COUNT(*) FROM ai_sessions 
         WHERE user_id = auth.uid() 
           AND created_at > NOW() - INTERVAL '1 hour') < 10
      WHEN (auth.jwt() ->> 'subscription_tier') = 'personal' THEN
        (SELECT COUNT(*) FROM ai_sessions 
         WHERE user_id = auth.uid() 
           AND created_at > NOW() - INTERVAL '1 hour') < 100
      ELSE TRUE
    END
  );
```

### 6.3 組織レベルポリシー
```sql
-- 組織データ管理ポリシー
CREATE POLICY "organization_admin_access" ON organizations
  FOR ALL USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- 組織メンバー管理（管理者のみ）
CREATE POLICY "organization_member_management" ON organization_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "organization_member_delete" ON organization_members
  FOR DELETE USING (
    -- 自分のメンバーシップは削除可能
    user_id = auth.uid() OR
    -- 管理者は他のメンバーを削除可能
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );
```

## 7. 多要素認証 (MFA)

### 7.1 MFA設定
```typescript
// TOTP MFA設定
export async function setupMFA() {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'TaskTimeFlow TOTP'
  });
  
  if (error) throw error;
  
  return {
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    factorId: data.id
  };
}

// MFA検証
export async function verifyMFA(factorId: string, code: string) {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: factorId,
    code
  });
  
  return { data, error };
}

// MFA必須化（管理者向け）
export async function enforceMFAForOrganization(organizationId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .update({
      settings: {
        ...settings,
        mfa_required: true,
        mfa_grace_period_days: 7
      }
    })
    .eq('id', organizationId);
    
  return { data, error };
}
```

### 7.2 条件付きMFA
```sql
-- MFA必須条件設定
CREATE OR REPLACE FUNCTION check_mfa_requirement(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requires_mfa boolean := false;
  user_subscription text;
  org_requires_mfa boolean := false;
BEGIN
  -- ユーザーのサブスクリプション取得
  SELECT subscription_tier INTO user_subscription
  FROM users WHERE id = user_id;
  
  -- Pro以上は管理者判断でMFA必須化可能
  IF user_subscription IN ('pro', 'enterprise') THEN
    SELECT COALESCE(
      (settings->>'mfa_required')::boolean,
      false
    ) INTO org_requires_mfa
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = user_id AND om.role IN ('owner', 'admin')
    LIMIT 1;
    
    requires_mfa := org_requires_mfa;
  END IF;
  
  -- 高権限アクションの場合は常にMFA必須
  -- （この判定は呼び出し側で行う）
  
  RETURN requires_mfa;
END;
$$;
```

## 8. 権限・ロール管理

### 8.1 ロール定義
```typescript
// ユーザーロール定義
export enum UserRole {
  OWNER = 'owner',           // 組織オーナー
  ADMIN = 'admin',           // 組織管理者
  MEMBER = 'member',         // 一般メンバー
  GUEST = 'guest'            // ゲストユーザー
}

// 権限定義
export enum Permission {
  // プロジェクト権限
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  
  // タスク権限
  TASK_CREATE = 'task:create',
  TASK_READ = 'task:read',
  TASK_UPDATE = 'task:update',
  TASK_DELETE = 'task:delete',
  TASK_ASSIGN = 'task:assign',
  
  // 組織権限
  ORG_MANAGE_MEMBERS = 'org:manage_members',
  ORG_MANAGE_BILLING = 'org:manage_billing',
  ORG_MANAGE_SETTINGS = 'org:manage_settings',
  
  // データ権限
  DATA_EXPORT = 'data:export',
  DATA_IMPORT = 'data:import'
}

// ロール権限マッピング
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: [
    // 全権限
    ...Object.values(Permission)
  ],
  [UserRole.ADMIN]: [
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.TASK_ASSIGN,
    Permission.ORG_MANAGE_MEMBERS,
    Permission.ORG_MANAGE_SETTINGS,
    Permission.DATA_EXPORT
  ],
  [UserRole.MEMBER]: [
    Permission.PROJECT_READ,
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.DATA_EXPORT
  ],
  [UserRole.GUEST]: [
    Permission.PROJECT_READ,
    Permission.TASK_READ
  ]
};
```

### 8.2 権限チェック機能
```typescript
// 権限チェック関数
export async function checkPermission(
  userId: string,
  permission: Permission,
  resourceId?: string
): Promise<boolean> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return false;
  
  // サブスクリプション制限チェック
  const subscriptionTier = user.user.app_metadata?.subscription_tier;
  if (!checkSubscriptionPermission(subscriptionTier, permission)) {
    return false;
  }
  
  // 組織権限チェック
  if (resourceId) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, organization_id')
      .eq('user_id', userId)
      .single();
      
    if (membership) {
      const userRole = membership.role as UserRole;
      return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false;
    }
  }
  
  // デフォルト権限（個人使用）
  return ROLE_PERMISSIONS[UserRole.MEMBER].includes(permission);
}

// React Hook
export function usePermission(permission: Permission, resourceId?: string) {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      checkPermission(user.id, permission, resourceId)
        .then(setHasPermission)
        .finally(() => setLoading(false));
    } else {
      setHasPermission(false);
      setLoading(false);
    }
  }, [user, permission, resourceId]);
  
  return { hasPermission, loading };
}
```

## 9. セキュリティベストプラクティス

### 9.1 パスワードポリシー
```sql
-- パスワード強度チェック関数
CREATE OR REPLACE FUNCTION validate_password(password text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- 最小8文字
  IF length(password) < 8 THEN
    RETURN false;
  END IF;
  
  -- 大文字小文字数字特殊文字を含む
  IF NOT (
    password ~ '[A-Z]' AND
    password ~ '[a-z]' AND
    password ~ '[0-9]' AND
    password ~ '[^A-Za-z0-9]'
  ) THEN
    RETURN false;
  END IF;
  
  -- 一般的なパスワードを拒否
  IF password IN ('password', '12345678', 'qwerty123') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- パスワード変更履歴
CREATE TABLE password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 過去のパスワード使用防止
CREATE OR REPLACE FUNCTION prevent_password_reuse()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 過去5つのパスワードと重複チェック
  IF EXISTS (
    SELECT 1 FROM password_history ph
    WHERE ph.user_id = NEW.id
      AND ph.password_hash = NEW.encrypted_password
    ORDER BY ph.created_at DESC
    LIMIT 5
  ) THEN
    RAISE EXCEPTION 'Cannot reuse recent passwords';
  END IF;
  
  -- 履歴保存
  INSERT INTO password_history (user_id, password_hash)
  VALUES (NEW.id, NEW.encrypted_password);
  
  -- 古い履歴削除（最新10件のみ保持）
  DELETE FROM password_history
  WHERE user_id = NEW.id
    AND id NOT IN (
      SELECT id FROM password_history
      WHERE user_id = NEW.id
      ORDER BY created_at DESC
      LIMIT 10
    );
  
  RETURN NEW;
END;
$$;
```

### 9.2 不正アクセス検知
```sql
-- ログイン試行追跡
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 地理情報
  country TEXT,
  city TEXT,
  
  -- リスクスコア
  risk_score INTEGER DEFAULT 0
);

-- アカウントロック機能
CREATE TABLE account_locks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  locked_until TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 不正検知関数
CREATE OR REPLACE FUNCTION detect_suspicious_login(
  p_email text,
  p_ip_address inet,
  p_user_agent text,
  p_success boolean
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  failed_attempts integer;
  risk_score integer := 0;
  user_id uuid;
BEGIN
  -- ユーザーID取得
  SELECT id INTO user_id FROM users WHERE email = p_email;
  
  -- ログイン試行記録
  INSERT INTO login_attempts (email, ip_address, user_agent, success, risk_score)
  VALUES (p_email, p_ip_address, p_user_agent, p_success, risk_score);
  
  IF NOT p_success THEN
    -- 失敗回数カウント
    SELECT COUNT(*) INTO failed_attempts
    FROM login_attempts
    WHERE email = p_email
      AND NOT success
      AND attempted_at > NOW() - INTERVAL '1 hour';
    
    -- 5回失敗でロック
    IF failed_attempts >= 5 THEN
      INSERT INTO account_locks (user_id, locked_until, reason)
      VALUES (user_id, NOW() + INTERVAL '1 hour', 'Too many failed login attempts')
      ON CONFLICT (user_id) DO UPDATE SET
        locked_until = NOW() + INTERVAL '1 hour',
        reason = 'Too many failed login attempts';
    END IF;
  END IF;
END;
$$;
```

### 9.3 監査ログ
```sql
-- 監査ログテーブル
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自動監査ログ生成
CREATE OR REPLACE FUNCTION log_data_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    ip_address
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 重要テーブルに監査トリガー設定
CREATE TRIGGER audit_tasks_changes
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_data_changes();

CREATE TRIGGER audit_projects_changes
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_data_changes();
```

## 10. エンタープライズ向け高度なセキュリティ

### 10.1 IP制限
```sql
-- IP許可リスト
CREATE TABLE ip_allowlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ip_range CIDR NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IP制限チェック関数
CREATE OR REPLACE FUNCTION check_ip_allowlist(user_id uuid, client_ip inet)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  allowed boolean := false;
  org_id uuid;
BEGIN
  -- ユーザーの組織取得
  SELECT organization_id INTO org_id
  FROM organization_members
  WHERE user_id = check_ip_allowlist.user_id
    AND role IN ('owner', 'admin', 'member')
  LIMIT 1;
  
  -- IP許可リストチェック
  IF org_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM ip_allowlists
      WHERE organization_id = org_id
        AND client_ip << ip_range
    ) INTO allowed;
  ELSE
    -- 個人ユーザーは制限なし
    allowed := true;
  END IF;
  
  RETURN allowed;
END;
$$;
```

### 10.2 セッション管理
```typescript
// セッション管理クラス
export class EnterpriseSessionManager {
  private static readonly MAX_CONCURRENT_SESSIONS = 3;
  
  static async limitConcurrentSessions(userId: string) {
    // アクティブセッション数取得
    const { data: sessions } = await supabase
      .from('auth.sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // 制限超過時は古いセッションを無効化
    if (sessions && sessions.length > this.MAX_CONCURRENT_SESSIONS) {
      const sessionsToRevoke = sessions.slice(this.MAX_CONCURRENT_SESSIONS);
      
      for (const session of sessionsToRevoke) {
        await supabase.auth.admin.deleteUser(session.id);
      }
    }
  }
  
  // デバイス管理
  static async registerDevice(userId: string, deviceInfo: DeviceInfo) {
    const fingerprint = await this.generateDeviceFingerprint(deviceInfo);
    
    await supabase
      .from('user_devices')
      .upsert({
        user_id: userId,
        device_fingerprint: fingerprint,
        device_name: deviceInfo.name,
        device_type: deviceInfo.type,
        last_seen_at: new Date().toISOString(),
        trusted: false
      });
  }
}
```

この認証・認可アーキテクチャにより、TaskTimeFlowは商用SaaSとして必要なセキュリティレベルを確保し、スケーラブルで管理しやすい認証システムを構築できます。