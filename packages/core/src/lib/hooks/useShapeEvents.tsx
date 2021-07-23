import React from 'react'
import inputs from '../inputs'
import { Vec } from '../utils'
import { useTLState } from './useTLState'

export function useShapeEvents(
  id: string,
  isCurrentParent: boolean,
  rGroup: React.RefObject<SVGElement>
) {
  const state = useTLState()

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (isCurrentParent) return
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()

      rGroup.current?.setPointerCapture(e.pointerId)

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
    [rGroup, state, id, isCurrentParent]
  )

  const handlePointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (isCurrentParent) return
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()

      rGroup.current?.releasePointerCapture(e.pointerId)
      state.send('STOPPED_POINTING', inputs.pointerUp(e, id))
    },
    [rGroup, state, id, isCurrentParent]
  )

  const handlePointerEnter = React.useCallback(
    (e: React.PointerEvent) => {
      if (isCurrentParent) return
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()

      state.send('HOVERED_SHAPE', inputs.pointerEnter(e, id))
    },
    [state, id, isCurrentParent]
  )

  const handlePointerMove = React.useCallback(
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

      if (isCurrentParent) return

      state.send('MOVED_OVER_SHAPE', inputs.pointerEnter(e, id))
    },
    [state, id, isCurrentParent]
  )

  const handlePointerLeave = React.useCallback(
    (e: React.PointerEvent) => {
      if (isCurrentParent) return
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()

      state.send('UNHOVERED_SHAPE', { target: id })
    },
    [state, id, isCurrentParent]
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
