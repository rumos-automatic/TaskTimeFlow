import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create main Supabase client for client-side operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'tasktimeflow-auth',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'tasktimeflow-web'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Create Supabase client for server-side operations
export const createServerClient = () => {
  return createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Auth configuration
export const authConfig = {
  supabaseUrl,
  supabaseAnonKey,
  redirectUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  enableSignup: true,
  enablePasswordReset: true,
  enableOAuth: true,
  sessionTimeout: 3600000, // 1 hour
  maxLoginAttempts: 5,
  lockoutDuration: 900000, // 15 minutes
}

// Auth providers configuration
export const authProviders = [
  {
    id: 'google',
    name: 'Google',
    icon: '🚀',
    color: '#4285F4'
  }
] as const

// Helper function to get current user session
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Helper function to get current session
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

// Helper function to refresh session
export const refreshSession = async () => {
  const { data, error } = await supabase.auth.refreshSession()
  return { session: data.session, error }
}

// Helper function to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const { user } = await getCurrentUser()
  return !!user
}

// Helper function to get user profile from database
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

// Helper function to update user profile
export const updateUserProfile = async (userId: string, updates: Partial<Database['public']['Tables']['users']['Update']>) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  return { data, error }
}

// Helper function to log login attempt
export const logLoginAttempt = async (
  email: string,
  success: boolean,
  metadata?: {
    ip_address?: string
    user_agent?: string
    country?: string
    city?: string
  }
) => {
  const { error } = await supabase
    .from('login_attempts')
    .insert({
      email,
      success,
      ip_address: metadata?.ip_address,
      user_agent: metadata?.user_agent,
      country: metadata?.country,
      city: metadata?.city,
      risk_score: success ? 0 : 10
    })
  
  return { error }
}

// Helper function to check if account should be locked
export const checkAccountLock = async (email: string): Promise<boolean> => {
  const { data } = await supabase.rpc('should_lock_account', { email_param: email })
  return data === true
}

// Helper function to create account lock
export const createAccountLock = async (userId: string, reason: string, duration: number = authConfig.lockoutDuration) => {
  const lockedUntil = new Date(Date.now() + duration).toISOString()
  
  const { error } = await supabase
    .from('account_locks')
    .upsert({
      user_id: userId,
      locked_until: lockedUntil,
      reason
    })
  
  return { error }
}

// Helper function to check if account is currently locked
export const isAccountLocked = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('account_locks')
    .select('locked_until')
    .eq('user_id', userId)
    .single()
  
  if (!data) return false
  
  const now = new Date()
  const lockedUntil = new Date(data.locked_until)
  
  return now < lockedUntil
}

// Helper function to remove account lock
export const removeAccountLock = async (userId: string) => {
  const { error } = await supabase
    .from('account_locks')
    .delete()
    .eq('user_id', userId)
  
  return { error }
}

// Real-time subscription helpers
export const subscribeToUserUpdates = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`user_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

export const subscribeToUserTasks = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`user_tasks_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `assignee_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

export const subscribeToUserTimelineSlots = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`user_timeline_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'timeline_slots',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

// Subscription management helpers
export const getUserSubscription = async (userId: string) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
  
  return { data, error }
}

export const checkSubscriptionLimits = async (
  userId: string,
  resourceType: string,
  currentCount: number
): Promise<boolean> => {
  const { data } = await supabase.rpc('check_subscription_limit', {
    user_id_param: userId,
    resource_type: resourceType,
    current_count: currentCount
  })
  
  return data === true
}

// Error handling helpers
export const handleSupabaseError = (error: any): string => {
  if (!error) return ''
  
  // Common auth errors
  if (error.message?.includes('Invalid login credentials')) {
    return 'メールアドレスまたはパスワードが正しくありません'
  }
  
  if (error.message?.includes('Email not confirmed')) {
    return 'メールアドレスの確認が完了していません'
  }
  
  if (error.message?.includes('User already registered')) {
    return 'このメールアドレスは既に登録されています'
  }
  
  if (error.message?.includes('Password should be at least')) {
    return 'パスワードは6文字以上で設定してください'
  }
  
  if (error.message?.includes('Unable to validate email address')) {
    return '有効なメールアドレスを入力してください'
  }
  
  // Network errors
  if (error.message?.includes('fetch')) {
    return 'ネットワークエラーが発生しました。もう一度お試しください'
  }
  
  // Default fallback
  return error.message || '予期しないエラーが発生しました'
}