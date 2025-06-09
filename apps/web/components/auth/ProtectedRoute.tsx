'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  redirectTo?: string
  requireSubscription?: boolean
  requiredFeature?: string
  fallback?: ReactNode
}

export function ProtectedRoute({ 
  children, 
  redirectTo = '/login',
  requireSubscription = false,
  requiredFeature,
  fallback
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasSubscription, canAccess, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(redirectTo)
        return
      }

      if (requireSubscription && !hasSubscription()) {
        router.push('/pricing')
        return
      }

      if (requiredFeature && !canAccess(requiredFeature)) {
        router.push('/upgrade')
        return
      }
    }
  }, [isAuthenticated, isLoading, hasSubscription, canAccess, requireSubscription, requiredFeature, router, redirectTo])

  // Show loading state
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-tasktime-500" />
          <p className="text-sm text-gray-600">認証情報を確認中...</p>
        </div>
      </div>
    )
  }

  // Check authentication
  if (!isAuthenticated) {
    return null // Will redirect
  }

  // Check subscription requirement
  if (requireSubscription && !hasSubscription()) {
    return null // Will redirect
  }

  // Check feature access
  if (requiredFeature && !canAccess(requiredFeature)) {
    return null // Will redirect
  }

  return <>{children}</>
}

export default ProtectedRoute