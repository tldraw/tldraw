import React, { useEffect, useRef } from 'react'
import state from 'state'
import inputs from 'state/inputs'
import * as vec from 'utils/vec'
import { usePinch } from 'react-use-gesture'

/**
 * Capture zoom gestures (pinches, wheels and pans) and send to the state.
 * @param ref
 * @returns
 */
export default function useZoomEvents(
  ref: React.MutableRefObject<SVGSVGElement>
) {
  const rTouchDist = useRef(0)

  useEffect(() => {
    const element = ref.current

    if (!element) return

    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      e.stopPropagation()

      if (e.ctrlKey) {
        state.send('ZOOMED_CAMERA', {
          delta: e.deltaY,
          ...inputs.wheel(e),
        })
        return
      }

      state.send('PANNED_CAMERA', {
        delta: [e.deltaX, e.deltaY],
        ...inputs.wheel(e),
      })
    }

    function handleTouchMove(e: TouchEvent) {
      e.preventDefault()
      e.stopPropagation()

      if (e.touches.length === 2) {
        const { clientX: x0, clientY: y0 } = e.touches[0]
        const { clientX: x1, clientY: y1 } = e.touches[1]

        const dist = vec.dist([x0, y0], [x1, y1])
        const point = vec.med([x0, y0], [x1, y1])

        state.send('WHEELED', {
          delta: dist - rTouchDist.current,
          point,
        })

        rTouchDist.current = dist
      }
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    element.addEventListener('touchstart', handleTouchMove, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      element.removeEventListener('wheel', handleWheel)
      element.removeEventListener('touchstart', handleTouchMove)
      element.removeEventListener('touchmove', handleTouchMove)
    }
  }, [ref])

  const rPinchDa = useRef<number[] | undefined>(undefined)
  const rPinchPoint = useRef<number[] | undefined>(undefined)

  const bind = usePinch(({ pinching, da, origin }) => {
    if (!pinching) {
      state.send('STOPPED_PINCHING')
      rPinchDa.current = undefined
      rPinchPoint.current = undefined
      return
    }

    if (rPinchPoint.current === undefined) {
      state.send('STARTED_PINCHING')
      rPinchDa.current = da
      rPinchPoint.current = origin
    }

    const [distanceDelta, angleDelta] = vec.sub(rPinchDa.current, da)

    state.send('PINCHED', {
      delta: vec.sub(rPinchPoint.current, origin),
      point: origin,
      distanceDelta,
      angleDelta,
    })

    rPinchDa.current = da
    rPinchPoint.current = origin
  })

  return { ...bind() }
}
