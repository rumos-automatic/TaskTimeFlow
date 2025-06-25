import { useEffect, useRef, useCallback } from 'react'

interface AutoScrollOptions {
  isDragging: boolean
  dragPosition: { x: number; y: number }
  scrollThreshold?: number
  scrollSpeed?: number
  containerSelector?: string
}

export function useAutoScroll({
  isDragging,
  dragPosition,
  scrollThreshold = 100,
  scrollSpeed = 10,
  containerSelector = '[data-timeline="true"]'
}: AutoScrollOptions) {
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const clearScrollInterval = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
  }, [])

  const startAutoScroll = useCallback((direction: 'up' | 'down') => {
    clearScrollInterval()
    
    const container = document.querySelector(containerSelector) as HTMLElement
    if (!container) return

    scrollIntervalRef.current = setInterval(() => {
      const scrollAmount = direction === 'up' ? -scrollSpeed : scrollSpeed
      container.scrollTop += scrollAmount
    }, 16) // 60fps
  }, [containerSelector, scrollSpeed, clearScrollInterval])

  useEffect(() => {
    if (!isDragging) {
      clearScrollInterval()
      return
    }

    const handleAutoScroll = () => {
      const screenHeight = window.innerHeight
      const { y } = dragPosition

      // 上端でのスクロール
      if (y < scrollThreshold) {
        startAutoScroll('up')
      }
      // 下端でのスクロール
      else if (y > screenHeight - scrollThreshold) {
        startAutoScroll('down')
      }
      // 中央エリアではスクロール停止
      else {
        clearScrollInterval()
      }
    }

    handleAutoScroll()
  }, [isDragging, dragPosition, scrollThreshold, startAutoScroll, clearScrollInterval])

  useEffect(() => {
    return () => {
      clearScrollInterval()
    }
  }, [clearScrollInterval])

  return {
    clearAutoScroll: clearScrollInterval
  }
}