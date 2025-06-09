'use client'

import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, authConfig, logLoginAttempt, checkAccountLock, createAccountLock, isAccountLocked, removeAccountLock, handleSupabaseError } from '@/lib/supabase'
import type { 
  AuthContextType, 
  AuthState, 
  AuthAction, 
  LoginCredentials, 
  SignupCredentials, 
  OAuthCredentials,
  ResetPasswordCredentials,
  UpdatePasswordCredentials,
  UpdateProfileData,
  User,
  AuthSession,
  AuthError
} from '@/types/auth'

// Initial auth state
const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
  error: null,
  initialized: false
}

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload }
    case 'SET_SESSION':
      return { ...state, session: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_INITIALIZED':
      return { ...state, initialized: action.payload }
    case 'RESET':
      return { ...initialState, initialized: true, loading: false }
    default:
      return state
  }
}

// Create context
const AuthContext = createContext<AuthContextType | null>(null)

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const router = useRouter()

  // Helper to get user metadata
  const getUserMetadata = useCallback(() => {
    if (typeof window === 'undefined') return {}
    
    return {
      ip_address: undefined, // Will be determined server-side
      user_agent: navigator.userAgent,
      country: undefined, // Will be determined server-side  
      city: undefined // Will be determined server-side
    }
  }, [])

  // Sign in with email/password
  const signIn = useCallback(async (credentials: LoginCredentials): Promise<{ error: AuthError | null }> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      // Check if account should be locked
      const shouldLock = await checkAccountLock(credentials.email)
      if (shouldLock) {
        const error: AuthError = {
          message: 'アカウントが一時的にロックされています。しばらく時間をおいてから再度お試しください。',
          code: 'account_locked'
        }
        
        await logLoginAttempt(credentials.email, false, getUserMetadata())
        dispatch({ type: 'SET_ERROR', payload: error })
        return { error }
      }

      // Attempt sign in
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })

      // Log login attempt
      await logLoginAttempt(credentials.email, !authError, getUserMetadata())

      if (authError) {
        const error: AuthError = {
          message: handleSupabaseError(authError),
          code: authError.message
        }
        dispatch({ type: 'SET_ERROR', payload: error })
        return { error }
      }

      if (!data.user) {
        const error: AuthError = {
          message: 'ログインに失敗しました',
          code: 'login_failed'
        }
        dispatch({ type: 'SET_ERROR', payload: error })
        return { error }
      }

      // Check if account is locked
      const locked = await isAccountLocked(data.user.id)
      if (locked) {
        await supabase.auth.signOut()
        const error: AuthError = {
          message: 'アカウントが一時的にロックされています',
          code: 'account_locked'
        }
        dispatch({ type: 'SET_ERROR', payload: error })
        return { error }
      }

      // Remove any existing account locks on successful login
      await removeAccountLock(data.user.id)

      return { error: null }
      
    } catch (err) {
      const error: AuthError = {
        message: 'ログイン処理中にエラーが発生しました',
        code: 'unexpected_error'
      }
      dispatch({ type: 'SET_ERROR', payload: error })
      return { error }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [getUserMetadata])

  // Sign up with email/password
  const signUp = useCallback(async (credentials: SignupCredentials): Promise<{ error: AuthError | null }> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      const { data, error: authError } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            display_name: credentials.display_name || credentials.email.split('@')[0]
          }
        }
      })

      if (authError) {
        const error: AuthError = {
          message: handleSupabaseError(authError),
          code: authError.message
        }
        dispatch({ type: 'SET_ERROR', payload: error })
        return { error }
      }

      // If email confirmation is required
      if (!data.session && data.user && !data.user.email_confirmed_at) {
        return { error: null } // Success, but need email confirmation
      }

      return { error: null }
      
    } catch (err) {
      const error: AuthError = {
        message: 'サインアップ処理中にエラーが発生しました',
        code: 'unexpected_error'
      }
      dispatch({ type: 'SET_ERROR', payload: error })
      return { error }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Sign in with OAuth
  const signInWithOAuth = useCallback(async (credentials: OAuthCredentials): Promise<{ error: AuthError | null }> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: credentials.provider,
        options: {
          redirectTo: credentials.options?.redirectTo || `${authConfig.redirectUrl}/auth/callback`,
          scopes: credentials.options?.scopes?.join(' ')
        }
      })

      if (authError) {
        const error: AuthError = {
          message: handleSupabaseError(authError),
          code: authError.message
        }
        dispatch({ type: 'SET_ERROR', payload: error })
        return { error }
      }

      return { error: null }
      
    } catch (err) {
      const error: AuthError = {
        message: 'OAuth認証処理中にエラーが発生しました',
        code: 'unexpected_error'
      }
      dispatch({ type: 'SET_ERROR', payload: error })
      return { error }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Sign out
  const signOut = useCallback(async (): Promise<{ error: AuthError | null }> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      const { error: authError } = await supabase.auth.signOut()

      if (authError) {
        const error: AuthError = {
          message: handleSupabaseError(authError),
          code: authError.message
        }
        dispatch({ type: 'SET_ERROR', payload: error })
        return { error }
      }

      // Clear state and redirect to login
      dispatch({ type: 'RESET' })
      router.push('/login')

      return { error: null }
      
    } catch (err) {
      const error: AuthError = {
        message: 'ログアウト処理中にエラーが発生しました',
        code: 'unexpected_error'
      }
      dispatch({ type: 'SET_ERROR', payload: error })
      return { error }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [router])

  // Reset password
  const resetPassword = useCallback(async (credentials: ResetPasswordCredentials): Promise<{ error: AuthError | null }> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        credentials.email,
        {
          redirectTo: `${authConfig.redirectUrl}/auth/reset-password`
        }
      )

      if (authError) {
        const error: AuthError = {
          message: handleSupabaseError(authError),
          code: authError.message
        }
        dispatch({ type: 'SET_ERROR', payload: error })
        return { error }
      }

      return { error: null }
      
    } catch (err) {
      const error: AuthError = {
        message: 'パスワードリセット処理中にエラーが発生しました',
        code: 'unexpected_error'
      }
      dispatch({ type: 'SET_ERROR', payload: error })
      return { error }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Update password
  const updatePassword = useCallback(async (credentials: UpdatePasswordCredentials): Promise<{ error: AuthError | null }> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      const { error: authError } = await supabase.auth.updateUser({
        password: credentials.new_password
      })

      if (authError) {
        const error: AuthError = {
          message: handleSupabaseError(authError),
          code: authError.message
        }
        dispatch({ type: 'SET_ERROR', payload: error })
        return { error }
      }

      return { error: null }
      
    } catch (err) {
      const error: AuthError = {
        message: 'パスワード更新処理中にエラーが発生しました',
        code: 'unexpected_error'
      }
      dispatch({ type: 'SET_ERROR', payload: error })
      return { error }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Update profile
  const updateProfile = useCallback(async (data: UpdateProfileData): Promise<{ error: AuthError | null }> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      // Update auth metadata
      const authUpdate: any = {}
      if (data.display_name !== undefined) {
        authUpdate.data = { display_name: data.display_name }
      }

      if (Object.keys(authUpdate).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdate)
        if (authError) {
          const error: AuthError = {
            message: handleSupabaseError(authError),
            code: authError.message
          }
          dispatch({ type: 'SET_ERROR', payload: error })
          return { error }
        }
      }

      // Update database profile
      if (state.user) {
        const dbUpdate: any = {}
        if (data.display_name !== undefined) dbUpdate.display_name = data.display_name
        if (data.avatar_url !== undefined) dbUpdate.avatar_url = data.avatar_url
        if (data.timezone !== undefined) dbUpdate.timezone = data.timezone
        if (data.language !== undefined) dbUpdate.language = data.language
        if (data.notification_preferences !== undefined) dbUpdate.notification_preferences = data.notification_preferences
        if (data.ai_preferences !== undefined) dbUpdate.ai_preferences = data.ai_preferences

        if (Object.keys(dbUpdate).length > 0) {
          const { error: dbError } = await supabase
            .from('users')
            .update(dbUpdate)
            .eq('id', state.user.id)

          if (dbError) {
            const error: AuthError = {
              message: handleSupabaseError(dbError),
              code: 'database_error'
            }
            dispatch({ type: 'SET_ERROR', payload: error })
            return { error }
          }
        }
      }

      return { error: null }
      
    } catch (err) {
      const error: AuthError = {
        message: 'プロフィール更新処理中にエラーが発生しました',
        code: 'unexpected_error'
      }
      dispatch({ type: 'SET_ERROR', payload: error })
      return { error }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.user])

  // Refresh session
  const refreshSession = useCallback(async (): Promise<{ error: AuthError | null }> => {
    try {
      const { data, error: authError } = await supabase.auth.refreshSession()

      if (authError) {
        const error: AuthError = {
          message: handleSupabaseError(authError),
          code: authError.message
        }
        dispatch({ type: 'SET_ERROR', payload: error })
        return { error }
      }

      return { error: null }
      
    } catch (err) {
      const error: AuthError = {
        message: 'セッション更新処理中にエラーが発生しました',
        code: 'unexpected_error'
      }
      dispatch({ type: 'SET_ERROR', payload: error })
      return { error }
    }
  }, [])

  // Utility functions
  const isAuthenticated = !!state.user && !!state.session
  const isLoading = state.loading

  const hasSubscription = useCallback((tier?: string) => {
    if (!state.user) return false
    if (!tier) return state.user.subscription_tier !== 'free'
    
    const tiers = ['free', 'personal', 'pro', 'team', 'business', 'enterprise']
    const userTierIndex = tiers.indexOf(state.user.subscription_tier)
    const requiredTierIndex = tiers.indexOf(tier)
    
    return userTierIndex >= requiredTierIndex
  }, [state.user])

  const canAccess = useCallback((feature: string) => {
    if (!state.user) return false
    
    // Feature access based on subscription tier
    const tierFeatures: Record<string, string[]> = {
      free: ['basic_tasks', 'basic_timeline'],
      personal: ['basic_tasks', 'basic_timeline', 'ai_suggestions', 'google_sync'],
      pro: ['basic_tasks', 'basic_timeline', 'ai_suggestions', 'google_sync', 'advanced_analytics', 'integrations'],
      team: ['basic_tasks', 'basic_timeline', 'ai_suggestions', 'google_sync', 'advanced_analytics', 'integrations', 'team_collaboration'],
      business: ['basic_tasks', 'basic_timeline', 'ai_suggestions', 'google_sync', 'advanced_analytics', 'integrations', 'team_collaboration', 'advanced_security'],
      enterprise: ['basic_tasks', 'basic_timeline', 'ai_suggestions', 'google_sync', 'advanced_analytics', 'integrations', 'team_collaboration', 'advanced_security', 'sso', 'audit_logs']
    }
    
    const userFeatures = tierFeatures[state.user.subscription_tier] || tierFeatures.free
    return userFeatures.includes(feature)
  }, [state.user])

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          if (session?.user) {
            // Get user profile from database
            const { data: userProfile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (userProfile) {
              dispatch({ type: 'SET_USER', payload: userProfile as User })
              dispatch({ type: 'SET_SESSION', payload: session as AuthSession })
            }
          }
          
          dispatch({ type: 'SET_INITIALIZED', payload: true })
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      } catch (error) {
        if (mounted) {
          dispatch({ type: 'SET_ERROR', payload: { message: '認証の初期化に失敗しました' } })
          dispatch({ type: 'SET_INITIALIZED', payload: true })
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      }
    }

    initializeAuth()

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_IN' && session?.user) {
        // Get user profile from database
        const { data: userProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (userProfile) {
          dispatch({ type: 'SET_USER', payload: userProfile as User })
          dispatch({ type: 'SET_SESSION', payload: session as AuthSession })
        }
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'SET_USER', payload: null })
        dispatch({ type: 'SET_SESSION', payload: null })
      } else if (event === 'TOKEN_REFRESHED' && session) {
        dispatch({ type: 'SET_SESSION', payload: session as AuthSession })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextType = {
    user: state.user,
    session: state.session,
    loading: state.loading,
    error: state.error,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshSession,
    isAuthenticated,
    isLoading,
    hasSubscription,
    canAccess
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext