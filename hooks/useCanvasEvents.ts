/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { MutableRefObject, useCallback, useEffect } from 'react'
import state from 'state'
import {
  fastBrushSelect,
  fastDrawUpdate,
  fastPanUpdate,
  fastTransform,
  fastTranslate,
} from 'state/hacks'
import inputs from 'state/inputs'
import Vec from 'utils/vec'

export default function useCanvasEvents(
  rCanvas: MutableRefObject<SVGGElement>
) {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
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
    },
    []
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!inputs.canAccept(e.pointerId)) return

      const prev = inputs.pointer?.point
      const info = inputs.pointerMove(e)

      if (prev && state.isIn('selecting') && inputs.keys[' ']) {
        const delta = Vec.sub(prev, info.point)
        fastPanUpdate(delta)
        state.send('KEYBOARD_PANNED_CAMERA', {
          delta: Vec.sub(prev, info.point),
        })
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
    },
    []
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!inputs.canAccept(e.pointerId)) return

      rCanvas.current.releasePointerCapture(e.pointerId)

      state.send('STOPPED_POINTING', {
        id: 'canvas',
        ...inputs.pointerUp(e, 'canvas'),
      })
    },
    []
  )

  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if ('safari' in window) {
      e.preventDefault()
    }
  }, [])

  useEffect(() => {
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

    rCanvas.current.addEventListener('gestureend', preventGestureNavigation)
    rCanvas.current.addEventListener('gesturechange', preventGestureNavigation)
    rCanvas.current.addEventListener('gesturestart', preventGestureNavigation)
    rCanvas.current.addEventListener('touchstart', preventNavigation)

    return () => {
      if (rCanvas.current) {
        rCanvas.current.removeEventListener(
          'gestureend',
          preventGestureNavigation
        )
        rCanvas.current.removeEventListener(
          'gesturechange',
          preventGestureNavigation
        )
        rCanvas.current.removeEventListener(
          'gesturestart',
          preventGestureNavigation
        )
        rCanvas.current.removeEventListener('touchstart', preventNavigation)
      }
    }
  }, [])

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onTouchStart: handleTouchStart,
  }
}
