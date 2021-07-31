import * as React from 'react'
import { useTLContext } from './useTLContext'
import { inputs } from '../../inputs'

export function useCanvasEvents() {
  const { callbacks } = useTLContext()

  const onPointerDown = React.useCallback(
    (e) => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)

      if (e.button === 0) {
        const info = inputs.pointerDown(e, 'canvas')
        callbacks.onPointCanvas?.(info)
      }
    },
    [callbacks],
  )

  const onPointerMove = React.useCallback(
    (e) => {
      e.stopPropagation()
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        const info = inputs.pointerMove(e, 'canvas')
        callbacks.onDragCanvas?.(info)
      }
      const info = inputs.pointerMove(e, 'canvas')
      callbacks.onPointerMove?.(info)
    },
    [callbacks],
  )

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      const isDoubleClick = inputs.isDoubleClick()
      const info = inputs.pointerUp(e, 'canvas')

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget?.releasePointerCapture(e.pointerId)

        if (isDoubleClick && !(info.altKey || info.metaKey)) {
          callbacks.onDoublePointCanvas?.(info)
        }

        callbacks.onReleaseCanvas?.(info)
      }
      callbacks.onPointerUp?.(info)
    },
    [callbacks],
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
