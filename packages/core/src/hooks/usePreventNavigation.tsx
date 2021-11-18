/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as React from 'react'
import { useTLContext } from '~hooks'

export function usePreventNavigation(rCanvas: React.RefObject<HTMLDivElement>): void {
  const { bounds } = useTLContext()

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
      if (touchXPosition - touchXRadius < 10 || touchXPosition + touchXRadius > bounds.width - 10) {
        event.preventDefault()
      }
    }

    const elm = rCanvas.current

    if (!elm) return () => void null

    elm.addEventListener('touchstart', preventGestureNavigation)

    // @ts-ignore
    elm.addEventListener('gestureend', preventGestureNavigation)

    // @ts-ignore
    elm.addEventListener('gesturechange', preventGestureNavigation)

    // @ts-ignore
    elm.addEventListener('gesturestart', preventGestureNavigation)

    // @ts-ignore
    elm.addEventListener('touchstart', preventNavigation)

    return () => {
      if (elm) {
        elm.removeEventListener('touchstart', preventGestureNavigation)
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
  }, [rCanvas, bounds.width])
}
