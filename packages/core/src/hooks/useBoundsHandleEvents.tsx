import * as React from 'react'
import type { TLBoundsEdge, TLBoundsCorner } from '../types'
import { useTLContext } from './useTLContext'

export function useBoundsHandleEvents(
  id: TLBoundsCorner | TLBoundsEdge | 'rotate' | 'center' | 'left' | 'right'
) {
  const { callbacks, inputs } = useTLContext()

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      if (!inputs.pointerIsValid(e)) return
      const info = inputs.pointerDown(e, id)

      if (inputs.isDoubleClick() && !(info.altKey || info.metaKey)) {
        callbacks.onDoubleClickBoundsHandle?.(info, e)
      }
      callbacks.onPointBoundsHandle?.(info, e)
      callbacks.onPointerDown?.(info, e)
    },
    [inputs, callbacks, id]
  )

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      if (!inputs.pointerIsValid(e)) return
      const info = inputs.pointerUp(e, id)
      callbacks.onReleaseBoundsHandle?.(info, e)
      callbacks.onPointerUp?.(info, e)
    },
    [inputs, callbacks, id]
  )

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.pointerIsValid(e)) return
      e.stopPropagation()
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        callbacks.onDragBoundsHandle?.(inputs.pointerMove(e, id), e)
      }
      const info = inputs.pointerMove(e, id)
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
