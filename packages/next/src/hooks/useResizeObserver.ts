import * as React from 'react'
import type { TLNuBounds } from '~types'

export function useResizeObserver<T extends Element>(
  ref: React.RefObject<T>,
  onBoundsChange?: (bounds: TLNuBounds) => void
) {
  const rIsMounted = React.useRef(false)

  const [bounds, setBounds] = React.useState<TLNuBounds>({
    minX: 0,
    minY: 0,
    maxX: 100,
    maxY: 100,
    width: 100,
    height: 100,
  })

  // When the element resizes, update the bounds (stored in inputs)
  // and broadcast via the onBoundsChange callback prop.
  const updateBounds = React.useCallback(() => {
    if (rIsMounted.current) {
      const rect = ref.current?.getBoundingClientRect()

      if (rect) {
        const bounds: TLNuBounds = {
          minX: rect.left,
          maxX: rect.left + rect.width,
          minY: rect.top,
          maxY: rect.top + rect.height,
          width: rect.width,
          height: rect.height,
        }

        onBoundsChange?.(bounds)
      }
    } else {
      // Skip the first mount
      rIsMounted.current = true
    }
  }, [ref, onBoundsChange])

  React.useEffect(() => {
    window.addEventListener('scroll', updateBounds)
    window.addEventListener('resize', updateBounds)
    return () => {
      window.removeEventListener('scroll', updateBounds)
      window.removeEventListener('resize', updateBounds)
    }
  }, [])

  React.useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0].contentRect) {
        updateBounds()
      }
    })

    if (ref.current) {
      resizeObserver.observe(ref.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [ref])

  React.useEffect(() => {
    updateBounds()
  }, [ref])

  return { bounds }
}
