/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as React from 'react'
import { useTLState } from './useTLState'
import inputs from '../inputs'
import { Vec } from '../utils'
// import { fastBrushSelect, fastDrawUpdate, fastPanUpdate } from 'state/hacks'

export function useCanvasEvents(rCanvas: React.RefObject<SVGGElement>) {
  const state = useTLState()

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!inputs.canAccept(e.pointerId)) return

      rCanvas.current?.setPointerCapture(e.pointerId)

      const info = inputs.pointerDown(e, 'canvas')

      if (e.button === 0) {
        if (inputs.isDoubleClick() && !(info.altKey || info.metaKey)) {
          state.send('DOUBLE_POINTED_CANVAS', info)
        }

        state.send('POINTED_CANVAS', info)
      } else if (e.button === 2) {
        state.send('RIGHT_POINTED', info)
      }
    },
    [rCanvas, state]
  )

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!inputs.canAccept(e.pointerId)) return

      const prev = inputs.pointer?.point
      const info = inputs.pointerMove(e)

      if (prev && state.isIn('selecting') && inputs.keys[' ']) {
        const delta = Vec.sub(prev, info.point)
        // fastPanUpdate(delta)
        state.send('KEYBOARD_PANNED_CAMERA', {
          delta: Vec.sub(prev, info.point),
        })
        return
      }

      if (state.isIn('draw.editing')) {
        // fastDrawUpdate(info)
      } else if (state.isIn('brushSelecting')) {
        // fastBrushSelect(info.point)
      } else if (state.isIn('translatingSelection')) {
        // fastTranslate(info)
      } else if (state.isIn('transformingSelection')) {
        // fastTransform(info)
      }

      state.send('MOVED_POINTER', info)
    },
    [state]
  )

  const handlePointerUp = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!inputs.canAccept(e.pointerId)) return

      rCanvas.current?.releasePointerCapture(e.pointerId)

      state.send('STOPPED_POINTING', {
        id: 'canvas',
        ...inputs.pointerUp(e, 'canvas'),
      })
    },
    [rCanvas, state]
  )

  const handleTouchStart = React.useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if ('safari' in window) {
        e.preventDefault()
      }
    },
    []
  )

  React.useEffect(() => {
    const preventGestureNavigation = (event: TouchEvent) => {
      event.preventDefault()
    }

    const preventNavigation = (event: TouchEvent) => {
      // Center point of the touch area
      const touchXPosition = event.touches[0].pageX
      // Size of the touch area
      const touchXRadius = event.touches[0].radiusX || 0

      // We set a threshold (10px) on both sizes of the screen,
      // if the touch area overlaps with the screen edges
      // it's likely to trigger the navigation. We prevent the
      // touchstart event in that case.
      if (
        touchXPosition - touchXRadius < 10 ||
        touchXPosition + touchXRadius > window.innerWidth - 10
      ) {
        event.preventDefault()
      }
    }

    // @ts-ignore
    rCanvas.current.addEventListener('gestureend', preventGestureNavigation)

    // @ts-ignore
    rCanvas.current.addEventListener('gesturechange', preventGestureNavigation)

    // @ts-ignore
    rCanvas.current.addEventListener('gesturestart', preventGestureNavigation)

    // @ts-ignore
    rCanvas.current.addEventListener('touchstart', preventNavigation)

    const elm = rCanvas.current

    return () => {
      if (elm) {
        // @ts-ignore
        elm.removeEventListener('gestureend', preventGestureNavigation)
        // @ts-ignore
        elm.removeEventListener('gesturechange', preventGestureNavigation)
        // @ts-ignore
        elm.removeEventListener('gesturestart', preventGestureNavigation)
        // @ts-ignore
        elm.removeEventListener('touchstart', preventNavigation)
      }
    }
  }, [state, rCanvas])

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onTouchStart: handleTouchStart,
  }
}
