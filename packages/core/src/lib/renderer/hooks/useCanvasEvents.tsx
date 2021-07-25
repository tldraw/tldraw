/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as React from 'react'
import { useTLContext } from './useTLContext'
import inputs from '../../inputs'
import { Vec } from '../../utils'

export function useCanvasEvents(rCanvas: React.RefObject<SVGGElement>) {
  const { callbacks } = useTLContext()

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!inputs.canAccept(e.pointerId)) return

      rCanvas.current?.setPointerCapture(e.pointerId)

      const info = inputs.pointerDown(e, 'canvas')

      if (e.button === 0) {
        if (inputs.isDoubleClick() && !(info.altKey || info.metaKey)) {
          callbacks.onDoublePointCanvas?.(info)
        }

        callbacks.onPointCanvas?.(info)
      } else if (e.button === 2) {
        callbacks.onRightPointCanvas?.(info)
      }
    },
    [rCanvas, callbacks]
  )

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!inputs.canAccept(e.pointerId)) return

      const prev = inputs.pointer?.point
      const info = inputs.pointerMove(e, 'canvas')

      if (prev && inputs.keys[' '] && e.buttons === 1) {
        const delta = Vec.sub(prev, info.point)
        callbacks.onPan?.(delta)
        return
      }

      callbacks.onPointerMove?.(info)
    },
    [callbacks]
  )

  const handlePointerUp = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!inputs.canAccept(e.pointerId)) return

      rCanvas.current?.releasePointerCapture(e.pointerId)

      const info = inputs.pointerUp(e, 'canvas')

      callbacks.onStopPointing?.(info)
    },
    [rCanvas, callbacks]
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
  }, [callbacks, rCanvas])

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onTouchStart: handleTouchStart,
  }
}
