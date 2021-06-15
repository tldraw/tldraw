import { useCallback } from 'react'
import inputs from 'state/inputs'
import { Edge, Corner } from 'types'

import state from '../state'

export default function useBoundsEvents(handle: Edge | Corner | 'rotate') {
  const onPointerDown = useCallback(
    (e) => {
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)

      if (e.button === 0) {
        const info = inputs.pointerDown(e, handle)

        if (inputs.isDoubleClick() && !(info.altKey || info.metaKey)) {
          state.send('DOUBLE_POINTED_BOUNDS_HANDLE', info)
        }

        state.send('POINTED_BOUNDS_HANDLE', info)
      }
    },
    [handle]
  )

  const onPointerMove = useCallback(
    (e) => {
      if (e.buttons !== 1) return
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()
      state.send('MOVED_POINTER', inputs.pointerMove(e))
    },
    [handle]
  )

  const onPointerUp = useCallback((e) => {
    if (e.buttons !== 1) return
    if (!inputs.canAccept(e.pointerId)) return
    e.stopPropagation()
    e.currentTarget.releasePointerCapture(e.pointerId)
    e.currentTarget.replaceWith(e.currentTarget)
    state.send('STOPPED_POINTING', inputs.pointerUp(e))
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}
