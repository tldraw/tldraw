import * as React from 'react'
import { inputs } from '../../inputs'
import { useTLContext } from './useTLContext'

export function useHandleEvents(id: string) {
  const { callbacks } = useTLContext()

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      e.currentTarget?.setPointerCapture(e.pointerId)

      const info = inputs.pointerDown(e, id)
      callbacks.onPointHandle?.(info)
    },
    [callbacks, id],
  )

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      const isDoubleClick = inputs.isDoubleClick()
      const info = inputs.pointerUp(e, 'bounds')

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget?.releasePointerCapture(e.pointerId)

        if (isDoubleClick && !(info.altKey || info.metaKey)) {
          callbacks.onDoublePointHandle?.(info)
        }

        callbacks.onReleaseHandle?.(info)
      }
      callbacks.onStopPointing?.(info)
    },
    [callbacks],
  )

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        const info = inputs.pointerMove(e, id)
        callbacks.onDragHandle?.(info)
      } else {
        const info = inputs.pointerMove(e, id)
        callbacks.onPointerMove?.(info)
      }
    },
    [callbacks, id],
  )

  const onPointerEnter = React.useCallback(
    (e: React.PointerEvent) => {
      const info = inputs.pointerEnter(e, id)
      callbacks.onHoverHandle?.(info)
    },
    [callbacks, id],
  )

  const onPointerLeave = React.useCallback(
    (e: React.PointerEvent) => {
      const info = inputs.pointerEnter(e, id)
      callbacks.onUnhoverHandle?.(info)
    },
    [callbacks, id],
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
