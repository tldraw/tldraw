import * as React from 'react'
import { useTLContext } from './useTLContext'

export function useCanvasEvents() {
  const { callbacks, inputs } = useTLContext()

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return
      if (!inputs.pointerIsValid(e)) return

      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch (err) {
        // noop
      }

      const info = inputs.pointerDown(e, 'canvas')

      callbacks.onPointCanvas?.(info, e)
      callbacks.onPointerDown?.(info, e)
    },
    [callbacks, inputs]
  )

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.pointerIsValid(e)) return
      const info = inputs.pointerMove(e, 'canvas')

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        callbacks.onDragCanvas?.(info, e)
      }

      callbacks.onPointerMove?.(info, e)
    },
    [callbacks, inputs]
  )

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return

      inputs.activePointer = undefined

      if (!inputs.pointerIsValid(e)) return
      const isDoubleClick = inputs.isDoubleClick()
      const info = inputs.pointerUp(e, 'canvas')

      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget?.releasePointerCapture(e.pointerId)
        }
      } catch (err) {
        // noop
      }

      if (isDoubleClick && !(info.altKey || info.metaKey)) {
        callbacks.onDoubleClickCanvas?.(info, e)
      }

      callbacks.onReleaseCanvas?.(info, e)
      callbacks.onPointerUp?.(info, e)
    },
    [callbacks, inputs]
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
