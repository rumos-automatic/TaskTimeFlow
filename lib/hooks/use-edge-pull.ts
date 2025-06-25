import { useEffect, useState, useRef, useCallback } from 'react'

interface EdgePullOptions {
  onEdgeLeft?: () => void
  onEdgeRight?: () => void
  edgeThreshold?: number // px from edge
  holdDuration?: number // ms to hold before triggering
  enabled?: boolean
}

export function useEdgePull({
  onEdgeLeft,
  onEdgeRight,
  edgeThreshold = 30,
  holdDuration = 800,
  enabled = true
}: EdgePullOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const [isNearLeftEdge, setIsNearLeftEdge] = useState(false)
  const [isNearRightEdge, setIsNearRightEdge] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const positionRef = useRef({ x: 0, y: 0 })

  const clearEdgeTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const checkEdgeProximity = useCallback((x: number) => {
    if (!enabled || !isDragging) return

    const screenWidth = window.innerWidth
    const nearLeft = x <= edgeThreshold
    const nearRight = x >= screenWidth - edgeThreshold

    setIsNearLeftEdge(nearLeft)
    setIsNearRightEdge(nearRight)

    // Clear any existing timeout
    clearEdgeTimeout()

    // Set new timeout if near edge
    if (nearLeft && onEdgeLeft) {
      timeoutRef.current = setTimeout(() => {
        onEdgeLeft()
      }, holdDuration)
    } else if (nearRight && onEdgeRight) {
      timeoutRef.current = setTimeout(() => {
        onEdgeRight()
      }, holdDuration)
    }
  }, [enabled, isDragging, edgeThreshold, holdDuration, onEdgeLeft, onEdgeRight, clearEdgeTimeout])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    positionRef.current = { x: e.clientX, y: e.clientY }
    checkEdgeProximity(e.clientX)
  }, [checkEdgeProximity])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      positionRef.current = { x: touch.clientX, y: touch.clientY }
      checkEdgeProximity(touch.clientX)
    }
  }, [checkEdgeProximity])

  const startDrag = useCallback(() => {
    setIsDragging(true)
  }, [])

  const endDrag = useCallback(() => {
    setIsDragging(false)
    setIsNearLeftEdge(false)
    setIsNearRightEdge(false)
    clearEdgeTimeout()
  }, [clearEdgeTimeout])

  useEffect(() => {
    if (!enabled) return

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('mouseup', endDrag)
      document.addEventListener('touchend', endDrag)
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('mouseup', endDrag)
      document.removeEventListener('touchend', endDrag)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('mouseup', endDrag)
      document.removeEventListener('touchend', endDrag)
    }
  }, [isDragging, enabled, handleMouseMove, handleTouchMove, endDrag])

  useEffect(() => {
    return () => {
      clearEdgeTimeout()
    }
  }, [clearEdgeTimeout])

  return {
    isDragging,
    isNearLeftEdge,
    isNearRightEdge,
    startDrag,
    endDrag,
    currentPosition: positionRef.current
  }
}