export interface User {
  id: string
  email: string
  display_name?: string
  avatar_url?: string
  timezone: string
  language: string
  subscription_tier: SubscriptionTier
  subscription_status: SubscriptionStatus
  subscription_expires_at?: string
  trial_ends_at?: string
  created_at: string
  updated_at: string
  last_login_at?: string
  notification_preferences: NotificationPreferences
  ai_preferences: AIPreferences
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_at?: number
  expires_in: number
  token_type: string
  user: User
}

export interface AuthError {
  message: string
  status?: number
  code?: string
}

export type SubscriptionTier = 'free' | 'personal' | 'pro' | 'team' | 'business' | 'enterprise'
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trial'

export interface NotificationPreferences {
  desktop: boolean
  sound: boolean
  email_digest: 'never' | 'daily' | 'weekly'
}

export interface AIPreferences {
  preferred_provider: 'openai' | 'claude' | 'gemini'
  auto_suggestions: boolean
  api_keys_encrypted: Record<string, string>
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials {
  email: string
  password: string
  display_name?: string
}

export interface ResetPasswordCredentials {
  email: string
}

export interface UpdatePasswordCredentials {
  password: string
  new_password: string
}

export interface UpdateProfileData {
  display_name?: string
  avatar_url?: string
  timezone?: string
  language?: string
  notification_preferences?: NotificationPreferences
  ai_preferences?: AIPreferences
}

export interface AuthProvider {
  id: string
  name: string
  icon: string
  color: string
}

export interface OAuthCredentials {
  provider: 'google' | 'github' | 'apple'
  options?: {
    redirectTo?: string
    scopes?: string[]
  }
}

export interface AuthContextType {
  user: User | null
  session: AuthSession | null
  loading: boolean
  error: AuthError | null
  
  // Auth methods
  signIn: (credentials: LoginCredentials) => Promise<{ error: AuthError | null }>
  signUp: (credentials: SignupCredentials) => Promise<{ error: AuthError | null }>
  signInWithOAuth: (credentials: OAuthCredentials) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  
  // Password methods
  resetPassword: (credentials: ResetPasswordCredentials) => Promise<{ error: AuthError | null }>
  updatePassword: (credentials: UpdatePasswordCredentials) => Promise<{ error: AuthError | null }>
  
  // Profile methods
  updateProfile: (data: UpdateProfileData) => Promise<{ error: AuthError | null }>
  refreshSession: () => Promise<{ error: AuthError | null }>
  
  // Utility methods
  isAuthenticated: boolean
  isLoading: boolean
  hasSubscription: (tier?: SubscriptionTier) => boolean
  canAccess: (feature: string) => boolean
}

export interface AuthState {
  user: User | null
  session: AuthSession | null
  loading: boolean
  error: AuthError | null
  initialized: boolean
}

export type AuthAction = 
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_SESSION'; payload: AuthSession | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: AuthError | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'RESET' }

export interface LoginAttempt {
  id: string
  email: string
  ip_address?: string
  user_agent?: string
  success: boolean
  attempted_at: string
  country?: string
  city?: string
  risk_score: number
}

export interface AccountLock {
  user_id: string
  locked_until: string
  reason: string
  created_at: string
}

export interface AuthConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  redirectUrl: string
  googleClientId?: string
  enableSignup: boolean
  enablePasswordReset: boolean
  enableOAuth: boolean
  sessionTimeout: number
  maxLoginAttempts: number
  lockoutDuration: number
}