import { useEffect } from 'react'

interface PullToRefreshBlockerOptions {
  isActive: boolean
}

export function usePullToRefreshBlocker({ isActive }: PullToRefreshBlockerOptions) {
  useEffect(() => {
    if (!isActive) return

    let startY = 0
    let currentY = 0

    const preventDefault = (e: Event) => {
      e.preventDefault()
    }

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      currentY = e.touches[0].clientY
      const deltaY = currentY - startY

      // 下方向にスクロールしようとしている場合（プルトゥリフレッシュ）
      if (deltaY > 0 && window.scrollY === 0) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    // ドキュメント全体でプルトゥリフレッシュを防止
    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', preventDefault, { passive: false })
    document.addEventListener('scroll', preventDefault, { passive: false })

    // bodyのスタイルを設定
    document.body.style.overscrollBehavior = 'none'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', preventDefault)
      document.removeEventListener('scroll', preventDefault)

      // bodyのスタイルを復元
      document.body.style.overscrollBehavior = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
    }
  }, [isActive])
}