import { useEffect } from 'react'

interface ScrollLockOptions {
  isLocked: boolean
  containerSelector?: string
}

export function useScrollLock({
  isLocked,
  containerSelector = '[data-timeline="true"]'
}: ScrollLockOptions) {
  useEffect(() => {
    if (!isLocked) return

    const container = document.querySelector(containerSelector) as HTMLElement
    if (!container) return

    // スクロールのみをロック、ドラッグは許可
    const originalOverscrollBehavior = container.style.overscrollBehavior
    container.style.overscrollBehavior = 'none'

    // スクロールイベントをキャンセル
    const preventScroll = (e: Event) => {
      e.preventDefault()
    }
    
    container.addEventListener('scroll', preventScroll, { passive: false })

    return () => {
      container.style.overscrollBehavior = originalOverscrollBehavior
      container.removeEventListener('scroll', preventScroll)
    }
  }, [isLocked, containerSelector])
}