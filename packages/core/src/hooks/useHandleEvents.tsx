import * as React from 'react'
import { useTLContext } from './useTLContext'

export function useHandleEvents(id: string) {
  const { inputs, callbacks } = useTLContext()

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      if (!inputs.pointerIsValid(e)) return
      e.stopPropagation()
      e.currentTarget?.setPointerCapture(e.pointerId)

      const info = inputs.pointerDown(e, id)
      callbacks.onPointHandle?.(info, e)
      callbacks.onPointerDown?.(info, e)
    },
    [inputs, callbacks, id]
  )

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      if (!inputs.pointerIsValid(e)) return
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
    [inputs, callbacks]
  )

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.pointerIsValid(e)) return
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        const info = inputs.pointerMove(e, id)
        callbacks.onDragHandle?.(info, e)
      }
      const info = inputs.pointerMove(e, id)
      callbacks.onPointerMove?.(info, e)
    },
    [inputs, callbacks, id]
  )

  const onPointerEnter = React.useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.pointerIsValid(e)) return
      const info = inputs.pointerEnter(e, id)
      callbacks.onHoverHandle?.(info, e)
    },
    [inputs, callbacks, id]
  )

  const onPointerLeave = React.useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.pointerIsValid(e)) return
      const info = inputs.pointerEnter(e, id)
      callbacks.onUnhoverHandle?.(info, e)
    },
    [inputs, callbacks, id]
  )

  return {
    onPointerDown,
    onPointerUp,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
  }
}
