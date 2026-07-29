import { useState, useEffect, useCallback } from 'react'

export function useVirtualization({ itemCount, itemHeight, containerHeight }) {
  const [scrollTop, setScrollTop] = useState(0)

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2)
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + 2
  )

  const visibleItems = []
  for (let i = startIndex; i <= endIndex && i < itemCount; i++) {
    visibleItems.push({
      index: i,
      style: {
        position: 'absolute',
        top: `${i * itemHeight}px`,
        left: 0,
        right: 0,
        height: `${itemHeight}px`
      }
    })
  }

  const totalHeight = itemCount * itemHeight

  return {
    virtualItems: visibleItems,
    totalHeight,
    handleScroll,
    startIndex,
    endIndex
  }
}
