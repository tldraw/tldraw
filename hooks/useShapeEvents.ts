/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import React, { MutableRefObject, useCallback } from 'react'
import state from 'state'
import inputs from 'state/inputs'
import Vec from 'utils/vec'

export default function useShapeEvents(
  id: string,
  isParent: boolean,
  rGroup: MutableRefObject<SVGElement>
) {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isParent) return
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()
      rGroup.current.setPointerCapture(e.pointerId)

      const info = inputs.pointerDown(e, id)

      if (e.button === 0) {
        if (inputs.isDoubleClick() && !(info.altKey || info.metaKey)) {
          state.send('DOUBLE_POINTED_SHAPE', info)
        }

        state.send('POINTED_SHAPE', info)
      } else {
        state.send('RIGHT_POINTED', info)
      }
    },
    [id]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()
      rGroup.current.releasePointerCapture(e.pointerId)
      state.send('STOPPED_POINTING', inputs.pointerUp(e, id))
    },
    [id]
  )

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.canAccept(e.pointerId)) return

      if (isParent) {
        state.send('HOVERED_GROUP', inputs.pointerEnter(e, id))
      } else {
        state.send('HOVERED_SHAPE', inputs.pointerEnter(e, id))
      }
    },
    [id]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.canAccept(e.pointerId)) return

      const prev = inputs.pointer?.point
      const info = inputs.pointerMove(e)

      if (prev && state.isIn('selecting') && inputs.keys[' ']) {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.setPointerCapture(e.pointerId)
        }

        state.send('KEYBOARD_PANNED_CAMERA', {
          delta: Vec.sub(prev, info.point),
        })
        return
      }

      if (isParent) {
        state.send('MOVED_OVER_GROUP', inputs.pointerEnter(e, id))
      } else {
        state.send('MOVED_OVER_SHAPE', inputs.pointerEnter(e, id))
      }
    },
    [id]
  )

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.canAccept(e.pointerId)) return

      if (isParent) {
        state.send('UNHOVERED_GROUP', { target: id })
      } else {
        state.send('UNHOVERED_SHAPE', { target: id })
      }
    },
    [id]
  )

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
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
