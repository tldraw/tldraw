import { MutableRefObject, useCallback } from 'react'
import state from 'state'
import { fastBrushSelect, fastDrawUpdate } from 'state/hacks'
import inputs from 'state/inputs'
import { isMobile } from 'utils/utils'

export default function useCanvasEvents(
  rCanvas: MutableRefObject<SVGGElement | HTMLDivElement>
) {
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isMobile()) {
      if (e.touches.length === 2) {
        state.send('TOUCH_UNDO')
      } else state.send('TOUCHED_CANVAS')
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!inputs.canAccept(e.pointerId)) return

    if (state.isIn('draw.editing')) {
      fastDrawUpdate(inputs.pointerMove(e))
      return
    }

    if (state.isIn('brushSelecting')) {
      const info = inputs.pointerMove(e)
      fastBrushSelect(info.point)
      return
    }

    state.send('MOVED_POINTER', inputs.pointerMove(e))
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!inputs.canAccept(e.pointerId)) return
    rCanvas.current.releasePointerCapture(e.pointerId)
    state.send('STOPPED_POINTING', { id: 'canvas', ...inputs.pointerUp(e) })
  }, [])

  return {
    onTouchStart: handleTouchStart,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  }
}
