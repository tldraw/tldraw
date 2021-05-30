import { useCallback, useRef } from 'react'
import inputs from 'state/inputs'
import { Edge, Corner } from 'types'

import state from '../state'

export default function useBoundsHandleEvents(
  handle: Edge | Corner | 'rotate'
) {
  const onPointerDown = useCallback(
    (e) => {
      if (e.buttons !== 1) return
      if (!inputs.canAccept(e.pointerId)) return
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      state.send('POINTED_BOUNDS_HANDLE', inputs.pointerDown(e, handle))
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
