import * as React from 'react'
import ResizeObserver from 'resize-observer-polyfill'
import { useTLContext } from '~hooks'
import type { TLBounds } from '~types'
import { Utils } from '~utils'

// Credits: from excalidraw
// https://github.com/excalidraw/excalidraw/blob/07ebd7c68ce6ff92ddbc22d1c3d215f2b21328d6/src/utils.ts#L542-L563
const getNearestScrollableContainer = (element: HTMLElement): HTMLElement | Document => {
  let parent = element.parentElement
  while (parent) {
    if (parent === document.body) {
      return document
    }
    const { overflowY } = window.getComputedStyle(parent)
    const hasScrollableContent = parent.scrollHeight > parent.clientHeight
    if (
      hasScrollableContent &&
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
    ) {
      return parent
    }
    parent = parent.parentElement
  }
  return document
}

export function useResizeObserver<T extends HTMLElement>(
  ref: React.RefObject<T>,
  onBoundsChange: (bounds: TLBounds) => void
) {
  const { inputs, callbacks } = useTLContext()

  const rIsMounted = React.useRef(false)

  // When the element resizes, update the bounds (stored in inputs)
  // and broadcast via the onBoundsChange callback prop.
  const updateBounds = React.useCallback(() => {
    if (rIsMounted.current) {
      const rect = ref.current?.getBoundingClientRect()

      if (rect) {
        const bounds: TLBounds = {
          minX: rect.left,
          maxX: rect.left + rect.width,
          minY: rect.top,
          maxY: rect.top + rect.height,
          width: rect.width,
          height: rect.height,
        }

        inputs.bounds = bounds

        onBoundsChange(bounds)

        callbacks.onBoundsChange?.(bounds)
      }
    } else {
      // Skip the first mount
      rIsMounted.current = true
    }
  }, [ref, inputs, callbacks.onBoundsChange])

  React.useEffect(() => {
    const scrollingAnchor = ref.current ? getNearestScrollableContainer(ref.current) : document
    const debouncedupdateBounds = Utils.debounce(updateBounds, 100)
    scrollingAnchor.addEventListener('scroll', debouncedupdateBounds)
    window.addEventListener('resize', debouncedupdateBounds)
    return () => {
      scrollingAnchor.removeEventListener('scroll', debouncedupdateBounds)
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
