import { MutableRefObject, useCallback, useRef } from 'react'
import state from 'state'
import inputs from 'state/inputs'

export default function useShapeEvents(
  id: string,
  isGroup: boolean,
  rGroup: MutableRefObject<SVGElement>
) {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isGroup) return
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()
      rGroup.current.setPointerCapture(e.pointerId)

      if (e.button === 0) {
        if (inputs.isDoubleClick()) {
          state.send('DOUBLE_POINTED_SHAPE', inputs.pointerDown(e, id))
        }

        state.send('POINTED_SHAPE', inputs.pointerDown(e, id))
      } else {
        state.send('RIGHT_POINTED', inputs.pointerDown(e, id))
      }
    },
    [id]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()
      rGroup.current.releasePointerCapture(e.pointerId)
      state.send('STOPPED_POINTING', inputs.pointerUp(e))
    },
    [id]
  )

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent) => {
      if (!inputs.canAccept(e.pointerId)) return
      if (isGroup) {
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

      if (isGroup) {
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
      if (isGroup) {
        state.send('UNHOVERED_GROUP', { target: id })
      } else {
        state.send('UNHOVERED_SHAPE', { target: id })
      }
    },
    [id]
  )

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerEnter: handlePointerEnter,
    onPointerMove: handlePointerMove,
    onPointerLeave: handlePointerLeave,
  }
}
