import { useEffect } from 'react'

interface PullToRefreshBlockerOptions {
  isActive: boolean
}

export function usePullToRefreshBlocker({ isActive }: PullToRefreshBlockerOptions) {
  useEffect(() => {
    if (!isActive) return

    // プルトゥリフレッシュのみを防止
    const originalOverscroll = document.body.style.overscrollBehavior
    document.body.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overscrollBehavior = originalOverscroll
    }
  }, [isActive])
}