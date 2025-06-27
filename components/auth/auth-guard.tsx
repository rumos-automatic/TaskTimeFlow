'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { AuthModal } from './auth-modal'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true)
    } else if (user) {
      setShowAuthModal(false)
    }
  }, [user, loading])

  // ロード中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold text-foreground mb-2">TaskTimeFlow</h2>
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  // 未認証の場合は認証モーダルを表示
  if (!user && showAuthModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <AuthModal onClose={() => setShowAuthModal(false)} />
      </div>
    )
  }

  // 認証済みの場合はアプリを表示
  return <>{children}</>
}