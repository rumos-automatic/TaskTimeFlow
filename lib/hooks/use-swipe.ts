'use client'

import { useEffect, useRef } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
}

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }: SwipeHandlers) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const touchEnd = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      touchEnd.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      }
    }

    const handleTouchEnd = () => {
      if (!touchStart.current || !touchEnd.current) return

      const deltaX = touchStart.current.x - touchEnd.current.x
      const deltaY = touchStart.current.y - touchEnd.current.y
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      // 横スワイプの場合のみ処理（縦スクロールを妨げない）
      if (absDeltaX > absDeltaY && absDeltaX > threshold) {
        if (deltaX > 0 && onSwipeLeft) {
          onSwipeLeft()
        } else if (deltaX < 0 && onSwipeRight) {
          onSwipeRight()
        }
      }

      // リセット
      touchStart.current = null
      touchEnd.current = null
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onSwipeLeft, onSwipeRight, threshold])
}