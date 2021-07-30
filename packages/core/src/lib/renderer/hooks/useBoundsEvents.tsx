import * as React from 'react'
import { inputs } from '../../inputs'
import { useTLContext } from './useTLContext'

export function useBoundsEvents() {
  const { callbacks } = useTLContext()

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      e.currentTarget?.setPointerCapture(e.pointerId)
      const info = inputs.pointerDown(e, 'bounds')

      callbacks.onPointBounds?.(info)
    },
    [callbacks],
  )

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      const isDoubleClick = inputs.isDoubleClick()
      const info = inputs.pointerUp(e, 'bounds')

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget?.releasePointerCapture(e.pointerId)

        if (isDoubleClick && !(info.altKey || info.metaKey)) {
          callbacks.onDoublePointBounds?.(info)
        }

        callbacks.onReleaseBounds?.(info)
      }

      callbacks.onStopPointing?.(info)
    },
    [callbacks],
  )

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        callbacks.onDragBounds?.(inputs.pointerMove(e, 'bounds'))
      } else {
        const info = inputs.pointerMove(e, 'bounds')
        callbacks.onPointerMove?.(info)
      }
    },
    [callbacks],
  )

  const onPointerEnter = React.useCallback(
    (e: React.PointerEvent) => {
      callbacks.onHoverBounds?.(inputs.pointerEnter(e, 'bounds'))
    },
    [callbacks],
  )

  const onPointerLeave = React.useCallback(
    (e: React.PointerEvent) => {
      callbacks.onUnhoverBounds?.(inputs.pointerEnter(e, 'bounds'))
    },
    [callbacks],
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
