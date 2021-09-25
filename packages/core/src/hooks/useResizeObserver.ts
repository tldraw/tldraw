import { useTLContext } from '+hooks'
import * as React from 'react'
import { Utils } from '+utils'

export function useResizeObserver<T extends Element>(ref: React.RefObject<T>) {
  const { inputs, callbacks } = useTLContext()

  const rIsMounted = React.useRef(false)

  const forceUpdate = React.useReducer((x) => x + 1, 0)[1]

  // When the element resizes, update the bounds (stored in inputs)
  // and broadcast via the onBoundsChange callback prop.
  const updateBounds = React.useCallback(() => {
    if (rIsMounted.current) {
      const rect = ref.current?.getBoundingClientRect()

      if (rect) {
        inputs.bounds = {
          minX: rect.left,
          maxX: rect.left + rect.width,
          minY: rect.top,
          maxY: rect.top + rect.height,
          width: rect.width,
          height: rect.height,
        }

        callbacks.onBoundsChange?.(inputs.bounds)

        // Force an update for a second mount
        forceUpdate()
      }
    } else {
      // Skip the first mount
      rIsMounted.current = true
    }
  }, [ref, forceUpdate, inputs, callbacks.onBoundsChange])

  React.useEffect(() => {
    const debouncedupdateBounds = Utils.debounce(updateBounds, 100)
    window.addEventListener('scroll', debouncedupdateBounds)
    window.addEventListener('resize', debouncedupdateBounds)
    return () => {
      window.removeEventListener('scroll', debouncedupdateBounds)
      window.removeEventListener('resize', debouncedupdateBounds)
    }
  }, [])

  React.useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (inputs.isPinching) {
        return
      }

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
  }, [ref, inputs])

  React.useEffect(() => {
    updateBounds()
  }, [ref])
}
