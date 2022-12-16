import * as React from 'react'
import type { TLBoundsCorner, TLBoundsEdge } from '~types'
import { useTLContext } from './useTLContext'

export function useBoundsHandleEvents(
  id: TLBoundsCorner | TLBoundsEdge | 'rotate' | 'center' | 'left' | 'right'
) {
  const { callbacks, inputs } = useTLContext()

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if ((e as any).dead) return
      else (e as any).dead = true
      if (!inputs.pointerIsValid(e)) return

      e.currentTarget?.setPointerCapture(e.pointerId)

      const info = inputs.pointerDown(e, id)

      if (e.button === 2) {
        // On right click
        callbacks.onRightPointBoundsHandle?.(info, e)
        return
      }

      // On left click
      if (e.button === 0) {
        callbacks.onPointBoundsHandle?.(info, e)
      }

      // On middle or left click
      callbacks.onPointerDown?.(info, e)
    },
    [inputs, callbacks, id]
  )

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if ((e as any).dead) return
      else (e as any).dead = true

      // On right click
      if (e.button === 2 || !inputs.pointerIsValid(e)) return

      const info = inputs.pointerUp(e, id)

      const isDoubleClick = inputs.isDoubleClick()

      // On left click up
      if (e.button === 0) {
        // On double left click
        if (isDoubleClick && !(info.altKey || info.metaKey)) {
          callbacks.onDoubleClickBoundsHandle?.(info, e)
        }

        callbacks.onReleaseBoundsHandle?.(info, e)
      }

      // On middle or left click up
      callbacks.onPointerUp?.(info, e)
    },
    [inputs, callbacks, id]
  )

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if ((e as any).dead) return
      else (e as any).dead = true

      if (!inputs.pointerIsValid(e)) return

      // On right click
      if (e.buttons === 2) {
        return
      }

      const info = inputs.pointerMove(e, id)

      // On left click drag
      if (e.buttons === 1) {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          callbacks.onDragBoundsHandle?.(info, e)
        }
      }

      // On left or middle click drag
      callbacks.onPointerMove?.(info, e)
    },
    [inputs, callbacks, id]
  )

  const onPointerEnter = React.useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.pointerIsValid(e)) return
      callbacks.onHoverBoundsHandle?.(inputs.pointerEnter(e, id), e)
    },
    [inputs, callbacks, id]
  )

  const onPointerLeave = React.useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.pointerIsValid(e)) return
      callbacks.onUnhoverBoundsHandle?.(inputs.pointerEnter(e, id), e)
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
