import * as React from 'react'
import { inputs } from '../../inputs'
import { useTLContext } from './useTLContext'

export function useShapeEvents(id: string, disable = false) {
  const { callbacks } = useTLContext()

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (disable) return
      // e.stopPropagation()
      e.currentTarget?.setPointerCapture(e.pointerId)

      const info = inputs.pointerDown(e, id)
      callbacks.onPointShape?.(info, e)
    },
    [callbacks, id, disable],
  )

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (disable) return
      // e.stopPropagation()
      const isDoubleClick = inputs.isDoubleClick()
      const info = inputs.pointerUp(e, id)

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget?.releasePointerCapture(e.pointerId)

        if (isDoubleClick && !(info.altKey || info.metaKey)) {
          callbacks.onDoublePointShape?.(info, e)
        }

        callbacks.onReleaseShape?.(info, e)
      }

      callbacks.onPointerUp?.(info, e)
      e.stopPropagation()
    },
    [callbacks, id, disable],
  )

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (disable) return
      // e.stopPropagation()
      const info = inputs.pointerMove(e, id)
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        callbacks.onDragShape?.(info, e)
      }
      callbacks.onPointerMove?.(info, e)
      e.stopPropagation()
    },
    [callbacks, id, disable],
  )

  const onPointerEnter = React.useCallback(
    (e: React.PointerEvent) => {
      if (disable) return
      const info = inputs.pointerEnter(e, id)
      callbacks.onHoverShape?.(info, e)
    },
    [callbacks, id, disable],
  )

  const onPointerLeave = React.useCallback(
    (e: React.PointerEvent) => {
      if (disable) return
      const info = inputs.pointerEnter(e, id)
      callbacks.onUnhoverShape?.(info, e)
    },
    [callbacks, id, disable],
  )

  const onTouchStart = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault()
  }, [])

  const onTouchEnd = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault()
  }, [])

  return {
    onPointerDown,
    onPointerUp,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
    onTouchStart,
    onTouchEnd,
  }
}
