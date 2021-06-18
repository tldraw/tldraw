import { useRef } from 'react'
import state from 'state'
import inputs from 'state/inputs'
import vec from 'utils/vec'
import { useGesture } from 'react-use-gesture'
import { fastPanUpdate, fastPinchCamera, fastZoomUpdate } from 'state/hacks'

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
        if (event.ctrlKey) {
          const { point } = inputs.wheel(event as WheelEvent)
          fastZoomUpdate(point, delta[1])
          // state.send('ZOOMED_CAMERA', {
          //   delta: delta[1],
          //   ...inputs.wheel(event as WheelEvent),
          // })
          return
        }

        if (state.isInAny('pointing', 'drawing')) {
          fastPanUpdate(delta)
          return
        }

        state.send('PANNED_CAMERA', {
          delta,
          ...inputs.wheel(event as WheelEvent),
        })
      },
      onPinch: ({ pinching, da, origin }) => {
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

        fastPinchCamera(
          origin,
          vec.sub(rPinchPoint.current, origin),
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
        rPinchPoint.current = origin
      },
    },
    {
      domTarget: document.body,
      eventOptions: { passive: false },
    }
  )
}
