/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useRef } from 'react'
import state from 'state'
import inputs from 'state/inputs'
import vec from 'utils/vec'
import { useGesture } from 'react-use-gesture'
import {
  fastBrushSelect,
  fastDrawUpdate,
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
        if (event.ctrlKey) {
          const { point } = inputs.wheel(event as WheelEvent)
          fastZoomUpdate(point, delta[1])
          return
        }

        fastPanUpdate(delta)

        const info = inputs.pointer

        if (state.isIn('draw.editing')) {
          fastDrawUpdate(info)
        } else if (state.isIn('brushSelecting')) {
          fastBrushSelect(info.point)
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

        const [distanceDelta] = vec.sub(rPinchDa.current, da)

        fastPinchCamera(
          origin,
          vec.sub(rPinchPoint.current, origin),
          distanceDelta
        )

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
