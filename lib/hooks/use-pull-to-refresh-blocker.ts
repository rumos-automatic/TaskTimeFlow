import { useEffect } from 'react'

interface PullToRefreshBlockerOptions {
  isActive: boolean
}

export function usePullToRefreshBlocker({ isActive }: PullToRefreshBlockerOptions) {
  useEffect(() => {
    if (!isActive) return

    // CSSによる軽量な防止策
    const originalOverscroll = document.body.style.overscrollBehavior
    const originalTouchAction = document.body.style.touchAction
    
    document.body.style.overscrollBehavior = 'none'
    document.body.style.touchAction = 'pan-x pinch-zoom'

    return () => {
      document.body.style.overscrollBehavior = originalOverscroll
      document.body.style.touchAction = originalTouchAction
    }
  }, [isActive])
}