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

    // CSSで軽量なスクロールロック
    const originalOverflow = container.style.overflow
    const originalTouchAction = container.style.touchAction
    const originalOverscrollBehavior = container.style.overscrollBehavior
    
    container.style.overflow = 'hidden'
    container.style.touchAction = 'none'
    container.style.overscrollBehavior = 'none'

    return () => {
      container.style.overflow = originalOverflow
      container.style.touchAction = originalTouchAction
      container.style.overscrollBehavior = originalOverscrollBehavior
    }
  }, [isLocked, containerSelector])
}