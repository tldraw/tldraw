import * as React from 'react'
import { inputs } from '~inputs'
import { useTLContext } from './useTLContext'

export function useHandleEvents(id: string) {
  const { callbacks } = useTLContext()

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.stopPropagation()
      e.currentTarget?.setPointerCapture(e.pointerId)

      const info = inputs.pointerDown(e, id)
      callbacks.onPointHandle?.(info, e)
      callbacks.onPointerDown?.(info, e)
    },
    [callbacks, id]
  )

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.stopPropagation()
      const isDoubleClick = inputs.isDoubleClick()
      const info = inputs.pointerUp(e, id)

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget?.releasePointerCapture(e.pointerId)

        if (isDoubleClick && !(info.altKey || info.metaKey)) {
          callbacks.onDoubleClickHandle?.(info, e)
        }

        callbacks.onReleaseHandle?.(info, e)
      }
      callbacks.onPointerUp?.(info, e)
    },
    [callbacks]
  )

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        const info = inputs.pointerMove(e, id)
        callbacks.onDragHandle?.(info, e)
      }
      const info = inputs.pointerMove(e, id)
      callbacks.onPointerMove?.(info, e)
    },
    [callbacks, id]
  )

  const onPointerEnter = React.useCallback(
    (e: React.PointerEvent) => {
      const info = inputs.pointerEnter(e, id)
      callbacks.onHoverHandle?.(info, e)
    },
    [callbacks, id]
  )

  const onPointerLeave = React.useCallback(
    (e: React.PointerEvent) => {
      const info = inputs.pointerEnter(e, id)
      callbacks.onUnhoverHandle?.(info, e)
    },
    [callbacks, id]
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
