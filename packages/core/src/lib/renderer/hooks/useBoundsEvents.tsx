import { useCallback } from 'react'
import { inputs } from '../../inputs'
import { TLBoundsEdge, TLBoundsCorner } from '../../types'

import { useTLContext } from './useTLContext'

export function useBoundsEvents(handle: TLBoundsEdge | TLBoundsCorner | 'rotate') {
  const { callbacks } = useTLContext()

  const onPointerDown = useCallback(
    (e) => {
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)

      if (e.button === 0) {
        const info = inputs.pointerDown(e, handle)

        if (inputs.isDoubleClick() && !(info.altKey || info.metaKey)) {
          callbacks.onDoublePointBoundsHandle?.(info)
        }

        callbacks.onPointBoundsHandle?.(info)
      }
    },
    [callbacks, handle],
  )

  const onPointerMove = useCallback(
    (e) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.stopPropagation()

        const info = inputs.pointerMove(e, handle)

        callbacks.onDragBoundsHandle?.(info)
      }
    },
    [callbacks, handle],
  )

  const onPointerUp = useCallback(
    (e) => {
      if (e.buttons !== 1) return
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()
      // Replace element to reset cursor
      e.currentTarget.releasePointerCapture(e.pointerId)
      e.currentTarget.replaceWith(e.currentTarget)

      const info = inputs.pointerUp(e, 'bounds')
      callbacks.onStopPointing?.(info)
    },
    [callbacks],
  )

  return { onPointerDown, onPointerMove, onPointerUp }
}
