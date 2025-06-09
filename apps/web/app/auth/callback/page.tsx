'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/login?error=auth_callback_failed')
          return
        }

        if (data.session) {
          // Get redirect URL from search params or default to dashboard
          const redirectTo = searchParams.get('redirect') || '/dashboard'
          router.push(redirectTo)
        } else {
          // No session found, redirect to login
          router.push('/login?error=no_session')
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err)
        router.push('/login?error=unexpected_error')
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-tasktime-500" />
        <p className="text-sm text-gray-600">認証を完了しています...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-tasktime-500" />
          <p className="text-sm text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}