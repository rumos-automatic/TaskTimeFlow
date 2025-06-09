'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react'
import { cn } from '@/lib/utils'

export interface VirtualListRef {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
  scrollToTop: () => void
  scrollToBottom: () => void
}

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number | ((index: number, item: T) => number)
  containerHeight: number
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  className?: string
  overscan?: number
  onScroll?: (scrollTop: number) => void
  estimatedItemHeight?: number
  getItemKey?: (item: T, index: number) => string | number
}

export const VirtualList = forwardRef<VirtualListRef, VirtualListProps<any>>(function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  estimatedItemHeight = 50,
  getItemKey
}: VirtualListProps<T>, ref) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollElementRef = useRef<HTMLDivElement>(null)
  
  // Calculate item heights if dynamic
  const itemHeights = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return Array(items.length).fill(itemHeight)
    }
    
    return items.map((item, index) => itemHeight(index, item))
  }, [items, itemHeight])

  // Calculate item positions
  const itemOffsets = useMemo(() => {
    const offsets = [0]
    for (let i = 1; i < itemHeights.length; i++) {
      offsets[i] = offsets[i - 1] + itemHeights[i - 1]
    }
    return offsets
  }, [itemHeights])

  const totalHeight = useMemo(() => {
    return itemOffsets[itemOffsets.length - 1] + (itemHeights[itemHeights.length - 1] || 0)
  }, [itemOffsets, itemHeights])

  // Binary search to find start index
  const findStartIndex = useCallback((scrollTop: number) => {
    let start = 0
    let end = itemOffsets.length - 1
    
    while (start <= end) {
      const mid = Math.floor((start + end) / 2)
      if (itemOffsets[mid] <= scrollTop) {
        start = mid + 1
      } else {
        end = mid - 1
      }
    }
    
    return Math.max(0, end)
  }, [itemOffsets])

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = findStartIndex(scrollTop)
    let endIndex = startIndex
    
    let currentOffset = itemOffsets[startIndex]
    while (currentOffset < scrollTop + containerHeight && endIndex < items.length - 1) {
      endIndex++
      currentOffset += itemHeights[endIndex]
    }
    
    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan)
    }
  }, [scrollTop, containerHeight, findStartIndex, itemOffsets, itemHeights, items.length, overscan])

  // Get visible items
  const visibleItems = useMemo(() => {
    const items_slice = []
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      items_slice.push({
        item: items[i],
        index: i,
        offset: itemOffsets[i],
        height: itemHeights[i]
      })
    }
    return items_slice
  }, [items, visibleRange, itemOffsets, itemHeights])

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
  }, [onScroll])

  // Scroll to index
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!scrollElementRef.current) return
    
    const offset = itemOffsets[index]
    const height = itemHeights[index]
    
    let scrollTop = offset
    
    if (align === 'center') {
      scrollTop = offset - (containerHeight - height) / 2
    } else if (align === 'end') {
      scrollTop = offset - containerHeight + height
    }
    
    scrollTop = Math.max(0, Math.min(scrollTop, totalHeight - containerHeight))
    
    scrollElementRef.current.scrollTop = scrollTop
    setScrollTop(scrollTop)
  }, [itemOffsets, itemHeights, containerHeight, totalHeight])

  // Expose scroll functions
  useImperativeHandle(ref, () => ({
    scrollToIndex,
    scrollToTop: () => scrollToIndex(0),
    scrollToBottom: () => scrollToIndex(items.length - 1, 'end')
  }))

  return (
    <div
      ref={scrollElementRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        style={{ height: totalHeight, position: 'relative' }}
      >
        {visibleItems.map(({ item, index, offset, height }) => {
          const key = getItemKey ? getItemKey(item, index) : index
          
          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: offset,
                left: 0,
                right: 0,
                height: height,
              }}
            >
              {renderItem(item, index, {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: height,
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
})

// Hook for managing virtual list state
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: Pick<VirtualListProps<T>, 'items' | 'itemHeight' | 'containerHeight' | 'overscan'>) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const itemHeights = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return Array(items.length).fill(itemHeight)
    }
    return items.map((item, index) => itemHeight(index, item))
  }, [items, itemHeight])

  const itemOffsets = useMemo(() => {
    const offsets = [0]
    for (let i = 1; i < itemHeights.length; i++) {
      offsets[i] = offsets[i - 1] + itemHeights[i - 1]
    }
    return offsets
  }, [itemHeights])

  const totalHeight = useMemo(() => {
    return itemOffsets[itemOffsets.length - 1] + (itemHeights[itemHeights.length - 1] || 0)
  }, [itemOffsets, itemHeights])

  const findStartIndex = useCallback((scrollTop: number) => {
    let start = 0
    let end = itemOffsets.length - 1
    
    while (start <= end) {
      const mid = Math.floor((start + end) / 2)
      if (itemOffsets[mid] <= scrollTop) {
        start = mid + 1
      } else {
        end = mid - 1
      }
    }
    
    return Math.max(0, end)
  }, [itemOffsets])

  const visibleRange = useMemo(() => {
    const startIndex = findStartIndex(scrollTop)
    let endIndex = startIndex
    
    let currentOffset = itemOffsets[startIndex]
    while (currentOffset < scrollTop + containerHeight && endIndex < items.length - 1) {
      endIndex++
      currentOffset += itemHeights[endIndex]
    }
    
    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan)
    }
  }, [scrollTop, containerHeight, findStartIndex, itemOffsets, itemHeights, items.length, overscan])

  const visibleItems = useMemo(() => {
    const result = []
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      result.push({
        item: items[i],
        index: i,
        offset: itemOffsets[i],
        height: itemHeights[i]
      })
    }
    return result
  }, [items, visibleRange, itemOffsets, itemHeights])

  return {
    scrollTop,
    setScrollTop,
    totalHeight,
    visibleRange,
    visibleItems,
    itemOffsets,
    itemHeights
  }
}

// Optimized virtual grid for 2D layouts
interface VirtualGridProps<T> {
  items: T[]
  itemWidth: number
  itemHeight: number
  containerWidth: number
  containerHeight: number
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  className?: string
  gap?: number
  overscan?: number
  getItemKey?: (item: T, index: number) => string | number
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  className,
  gap = 0,
  overscan = 5,
  getItemKey
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  
  // Calculate grid dimensions
  const columnsCount = Math.floor((containerWidth + gap) / (itemWidth + gap))
  const rowsCount = Math.ceil(items.length / columnsCount)
  const totalWidth = columnsCount * (itemWidth + gap) - gap
  const totalHeight = rowsCount * (itemHeight + gap) - gap
  
  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan)
    const endRow = Math.min(
      rowsCount - 1,
      Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + overscan
    )
    
    const startCol = Math.max(0, Math.floor(scrollLeft / (itemWidth + gap)) - overscan)
    const endCol = Math.min(
      columnsCount - 1,
      Math.ceil((scrollLeft + containerWidth) / (itemWidth + gap)) + overscan
    )
    
    return { startRow, endRow, startCol, endCol }
  }, [scrollTop, scrollLeft, containerHeight, containerWidth, itemHeight, itemWidth, gap, overscan, rowsCount, columnsCount])

  // Get visible items
  const visibleItems = useMemo(() => {
    const result = []
    
    for (let row = visibleRange.startRow; row <= visibleRange.endRow; row++) {
      for (let col = visibleRange.startCol; col <= visibleRange.endCol; col++) {
        const index = row * columnsCount + col
        if (index < items.length) {
          result.push({
            item: items[index],
            index,
            row,
            col,
            x: col * (itemWidth + gap),
            y: row * (itemHeight + gap)
          })
        }
      }
    }
    
    return result
  }, [items, visibleRange, columnsCount, itemWidth, itemHeight, gap])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
    setScrollLeft(e.currentTarget.scrollLeft)
  }, [])

  return (
    <div
      className={cn('overflow-auto', className)}
      style={{ width: containerWidth, height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        style={{
          width: totalWidth,
          height: totalHeight,
          position: 'relative'
        }}
      >
        {visibleItems.map(({ item, index, x, y }) => {
          const key = getItemKey ? getItemKey(item, index) : index
          
          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: itemWidth,
                height: itemHeight,
              }}
            >
              {renderItem(item, index, {
                width: itemWidth,
                height: itemHeight,
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default VirtualList