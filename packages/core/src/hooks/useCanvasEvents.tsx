import * as React from 'react'
import { useTLContext } from './useTLContext'
import { inputs } from '~inputs'

export function useCanvasEvents() {
  const { callbacks } = useTLContext()

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)

      if (e.button === 0) {
        const info = inputs.pointerDown(e, 'canvas')
        callbacks.onPointCanvas?.(info, e)
        callbacks.onPointerDown?.(info, e)
      }
    },
    [callbacks]
  )

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        const info = inputs.pointerMove(e, 'canvas')
        callbacks.onDragCanvas?.(info, e)
      }
      const info = inputs.pointerMove(e, 'canvas')
      callbacks.onPointerMove?.(info, e)
    },
    [callbacks]
  )

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      const isDoubleClick = inputs.isDoubleClick()
      const info = inputs.pointerUp(e, 'canvas')

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget?.releasePointerCapture(e.pointerId)
      }
      if (isDoubleClick && !(info.altKey || info.metaKey)) {
        callbacks.onDoubleClickCanvas?.(info, e)
      }

      callbacks.onReleaseCanvas?.(info, e)
      callbacks.onPointerUp?.(info, e)
    },
    [callbacks]
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
