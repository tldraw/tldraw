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
import Vec from 'utils/vec'

export default function useCanvasEvents(
  rCanvas: MutableRefObject<SVGGElement>
) {
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!inputs.canAccept(e.pointerId)) return

    rCanvas.current.setPointerCapture(e.pointerId)

    const info = inputs.pointerDown(e, 'canvas')

    if (e.button === 0) {
      if (inputs.isDoubleClick() && !(info.altKey || info.metaKey)) {
        state.send('DOUBLE_POINTED_CANVAS', info)
      }

      state.send('POINTED_CANVAS', info)
    } else if (e.button === 2) {
      state.send('RIGHT_POINTED', info)
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!inputs.canAccept(e.pointerId)) return

    const prev = inputs.pointer?.point
    const info = inputs.pointerMove(e)

    if (prev && state.isIn('selecting') && inputs.keys[' ']) {
      state.send('KEYBOARD_PANNED_CAMERA', { delta: Vec.sub(prev, info.point) })
      return
    }

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
