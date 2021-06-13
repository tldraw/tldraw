import React, { useEffect, useRef } from 'react'
import state from 'state'
import inputs from 'state/inputs'
import * as vec from 'utils/vec'
import { useGesture } from 'react-use-gesture'
import {
  fastBrushSelect,
  fastPanUpdate,
  fastPinchCamera,
  fastZoomUpdate,
} from 'state/hacks'

/**
 * Capture zoom gestures (pinches, wheels and pans) and send to the state.
 * @param ref
 * @returns
 */
export default function useZoomEvents() {
  const rPinchDa = useRef<number[] | undefined>(undefined)
  const rPinchPoint = useRef<number[] | undefined>(undefined)

  useGesture(
    {
      onWheel: ({ event, delta }) => {
        const d = vec.mul(delta, window.devicePixelRatio)

        if (event.ctrlKey) {
          const { point } = inputs.wheel(event as WheelEvent)
          fastZoomUpdate(point, d[1])
          return
        }

        if (state.isIn('pointing')) {
          fastPanUpdate(d)
          return
        }

        state.send('PANNED_CAMERA', {
          delta: d,
          ...inputs.wheel(event as WheelEvent),
        })
      },
      onPinch: ({ pinching, da, origin }) => {
        const dpr = window.devicePixelRatio
        const point = vec.mul(origin, dpr)

        if (!pinching) {
          state.send('STOPPED_PINCHING')
          rPinchDa.current = undefined
          rPinchPoint.current = undefined
          return
        }

        if (rPinchPoint.current === undefined) {
          state.send('STARTED_PINCHING')
          rPinchDa.current = da
          rPinchPoint.current = point
        }

        const [distanceDelta, angleDelta] = vec.sub(rPinchDa.current, da)

        fastPinchCamera(
          point,
          vec.sub(rPinchPoint.current, point),
          distanceDelta,
          angleDelta
        )

        // state.send('PINCHED', {
        //   delta: vec.sub(rPinchPoint.current, origin),
        //   point: origin,
        //   distanceDelta,
        //   angleDelta,
        // })

        rPinchDa.current = da
        rPinchPoint.current = point
      },
    },
    {
      domTarget: document.body,
      eventOptions: { passive: false },
    }
  )
}
