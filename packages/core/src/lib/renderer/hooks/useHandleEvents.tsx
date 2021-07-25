import { RefObject, useCallback } from 'react'
import inputs from '../../inputs'
import { useTLContext } from './useTLContext'

export function useHandleEvents(id: string, rGroup: RefObject<SVGElement>) {
  const { callbacks } = useTLContext()

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()
      rGroup.current?.setPointerCapture(e.pointerId)
      const info = inputs.pointerDown(e, id)

      callbacks.onPointHandle?.(info)
    },
    [rGroup, callbacks, id]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()
      rGroup.current?.releasePointerCapture(e.pointerId)
      const isDoubleClick = inputs.isDoubleClick()
      const info = inputs.pointerUp(e, id)

      if (isDoubleClick && !(info.altKey || info.metaKey)) {
        callbacks.onDoublePointHandle?.(info)
      } else {
        callbacks.onStopPointing?.(info)
      }
    },
    [rGroup, callbacks, id]
  )

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.canAccept(e.pointerId)) return

      callbacks.onHoverHandle?.(inputs.pointerEnter(e, id))
    },
    [callbacks, id]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.canAccept(e.pointerId)) return
      callbacks.onMoveOverHandle?.(inputs.pointerEnter(e, id))
    },
    [callbacks, id]
  )

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.canAccept(e.pointerId)) return
      callbacks.onUnhoverHandle?.(inputs.pointerEnter(e, id))
    },
    [callbacks, id]
  )

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerEnter: handlePointerEnter,
    onPointerMove: handlePointerMove,
    onPointerLeave: handlePointerLeave,
  }
}
