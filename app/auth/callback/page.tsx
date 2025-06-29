'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URLにcodeパラメータがあるかチェック
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        
        if (!code) {
          console.log('No auth code found, redirecting to home')
          router.push('/')
          return
        }

        // 既にセッションがあるかチェック
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('Already authenticated, redirecting to home')
          router.push('/')
          return
        }

        // codeをセッションに交換
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        )
        
        if (error) {
          console.error('Auth callback error:', error)
          // エラーの詳細をログに記録
          console.error('Error details:', {
            message: error.message,
            status: error.status,
            code: error.code
          })
          router.push('/?error=auth_callback_failed')
        } else {
          console.log('Auth callback successful')
          router.push('/')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/?error=auth_callback_failed')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-semibold text-foreground mb-2">認証処理中</h2>
        <p className="text-muted-foreground">しばらくお待ちください...</p>
      </div>
    </div>
  )
}