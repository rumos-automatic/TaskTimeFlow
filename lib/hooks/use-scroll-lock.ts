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

    // タッチイベントのデフォルト動作を防止
    const preventScroll = (e: TouchEvent) => {
      // ドラッグ中のタッチムーブイベントをキャンセル
      e.preventDefault()
      e.stopPropagation()
    }

    // スクロールイベントを防止
    const preventScrollEvent = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }

    // イベントリスナーを追加
    container.addEventListener('touchmove', preventScroll, { passive: false })
    container.addEventListener('scroll', preventScrollEvent, { passive: false })
    container.addEventListener('wheel', preventScrollEvent, { passive: false })

    // CSSでスクロールを無効化
    const originalOverflow = container.style.overflow
    const originalTouchAction = container.style.touchAction
    container.style.overflow = 'hidden'
    container.style.touchAction = 'none'

    return () => {
      // イベントリスナーを削除
      container.removeEventListener('touchmove', preventScroll)
      container.removeEventListener('scroll', preventScrollEvent)
      container.removeEventListener('wheel', preventScrollEvent)

      // CSSを復元
      container.style.overflow = originalOverflow
      container.style.touchAction = originalTouchAction
    }
  }, [isLocked, containerSelector])
}