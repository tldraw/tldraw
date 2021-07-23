/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useRef } from 'react'
import { useTLState } from './useTLState'
import inputs from '../inputs'
import { Vec } from '../utils'
import { useGesture } from 'react-use-gesture'

// import {
//   fastBrushSelect,
//   fastDrawUpdate,
//   fastPanUpdate,
//   fastPinchCamera,
//   fastZoomUpdate,
// } from 'state/hacks'

/**
 * Capture zoom gestures (pinches, wheels and pans) and send to the state.
 * @param ref
 * @returns
 */
export function useZoomEvents() {
  const rPinchDa = useRef<number[] | undefined>(undefined)
  const rPinchPoint = useRef<number[] | undefined>(undefined)

  const state = useTLState()

  useGesture(
    {
      onWheel: ({ event, delta }) => {
        if (event.ctrlKey) {
          const { point } = inputs.wheel(event as WheelEvent)
          // fastZoomUpdate(point, delta[1])
          return
        }

        // fastPanUpdate(delta)

        const info = inputs.pointer

        if (state.isIn('draw.editing')) {
          // fastDrawUpdate(info)
        } else if (state.isIn('brushSelecting')) {
          // fastBrushSelect(info.point)
        } else if (state.isIn('translatingSelection')) {
          // fastTranslate(info)
        } else if (state.isIn('transformingSelection')) {
          // fastTransform(info)
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

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const [distanceDelta] = Vec.sub(rPinchDa.current!, da)

        state.send('PINCHED_CAMERA', {
          point: origin,
          delta: Vec.sub(rPinchPoint.current, origin),
          distanceDelta,
        })

        // fastPinchCamera(
        // origin,
        // Vec.sub(rPinchPoint.current, origin),
        // distanceDelta
        // )

        rPinchDa.current = da
        rPinchPoint.current = origin
      },
    },
    {
      domTarget: typeof document === 'undefined' ? undefined : document.body,
      eventOptions: { passive: false },
    }
  )
}
