'use client'

import { useEffect, useRef } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
  targetRef?: React.RefObject<any>
  enabled?: boolean
}

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50, targetRef, enabled = true }: SwipeHandlers) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const touchEnd = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!enabled) return

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

    const target = targetRef?.current || document
    target.addEventListener('touchstart', handleTouchStart)
    target.addEventListener('touchmove', handleTouchMove)
    target.addEventListener('touchend', handleTouchEnd)

    return () => {
      target.removeEventListener('touchstart', handleTouchStart)
      target.removeEventListener('touchmove', handleTouchMove)
      target.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onSwipeLeft, onSwipeRight, threshold, targetRef, enabled])
}