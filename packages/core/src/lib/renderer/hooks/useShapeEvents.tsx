import React from 'react'
import inputs from '../../inputs'
import { Vec } from '../../utils'
import { useTLContext } from './useTLContext'

export function useShapeEvents(
  id: string,
  isCurrentParent: boolean,
  rGroup: React.RefObject<SVGElement>
) {
  const { callbacks } = useTLContext()

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (isCurrentParent) return
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()

      rGroup.current?.setPointerCapture(e.pointerId)

      const info = inputs.pointerDown(e, id)

      if (e.button === 0) {
        if (inputs.isDoubleClick() && !(info.altKey || info.metaKey)) {
          callbacks.onDoublePointShape?.(info)
        }

        callbacks.onPointShape?.(info)
      } else {
        callbacks.onRightPointShape?.(info)
      }
    },
    [rGroup, callbacks, id, isCurrentParent]
  )

  const handlePointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (isCurrentParent) return
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()

      rGroup.current?.releasePointerCapture(e.pointerId)

      const info = inputs.pointerDown(e, id)

      callbacks.onStopPointing?.(info)
    },
    [rGroup, callbacks, id, isCurrentParent]
  )

  const handlePointerEnter = React.useCallback(
    (e: React.PointerEvent) => {
      if (isCurrentParent) return
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()

      callbacks.onHoverShape?.(inputs.pointerEnter(e, id))
    },
    [callbacks, id, isCurrentParent]
  )

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.canAccept(e.pointerId)) return

      const prev = inputs.pointer?.point
      const info = inputs.pointerMove(e)

      if (prev && inputs.keys[' '] && e.buttons === 1) {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.setPointerCapture(e.pointerId)
        }

        const delta = Vec.sub(prev, info.point)

        callbacks.onPan?.(delta)
        return
      }

      if (isCurrentParent) return

      callbacks.onMoveOverShape?.(inputs.pointerEnter(e, id))
    },
    [callbacks, id, isCurrentParent]
  )

  const handlePointerLeave = React.useCallback(
    (e: React.PointerEvent) => {
      if (isCurrentParent) return
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()

      setTimeout(() => {
        callbacks.onUnhoverShape?.(inputs.pointerEnter(e, id))
      }, 0)
    },
    [callbacks, id, isCurrentParent]
  )

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault()
  }, [])

  const handleTouchEnd = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault()
  }, [])

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerEnter: handlePointerEnter,
    onPointerMove: handlePointerMove,
    onPointerLeave: handlePointerLeave,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  }
}
