/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { MutableRefObject, useCallback } from 'react'
import state from 'state'
import {
  fastBrushSelect,
  fastDrawUpdate,
  fastTransform,
  fastTranslate,
} from 'state/hacks'
import inputs from 'state/inputs'

export default function useCanvasEvents(
  rCanvas: MutableRefObject<SVGGElement>
) {
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!inputs.canAccept(e.pointerId)) return

    rCanvas.current.setPointerCapture(e.pointerId)

    if (e.button === 0) {
      state.send('POINTED_CANVAS', inputs.pointerDown(e, 'canvas'))
    } else if (e.button === 2) {
      state.send('RIGHT_POINTED', inputs.pointerDown(e, 'canvas'))
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!inputs.canAccept(e.pointerId)) return

    const info = inputs.pointerMove(e)

    if (state.isIn('draw.editing')) {
      fastDrawUpdate(info)
    } else if (state.isIn('brushSelecting')) {
      fastBrushSelect(info.point)
    } else if (state.isIn('translatingSelection')) {
      fastTranslate(info)
    } else if (state.isIn('transformingSelection')) {
      fastTransform(info)
    }

    state.send('MOVED_POINTER', info)
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!inputs.canAccept(e.pointerId)) return
    e.stopPropagation()

    rCanvas.current.releasePointerCapture(e.pointerId)

    state.send('STOPPED_POINTING', {
      id: 'canvas',
      ...inputs.pointerUp(e, 'canvas'),
    })
  }, [])

  const handleTouchStart = useCallback(() => {
    // if (isMobile()) {
    //   if (e.touches.length === 2) {
    //     state.send('TOUCH_UNDO')
    //   } else state.send('TOUCHED_CANVAS')
    // }
  }, [])

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onTouchStart: handleTouchStart,
  }
}
