/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useRef } from 'react'
import { useTLContext } from './useTLContext'
import { Vec } from '../../utils'
import { useGesture } from 'react-use-gesture'
import { inputs } from '../../inputs'

// Capture zoom gestures (pinches, wheels and pans)
export function useZoomEvents() {
  const rPinchDa = useRef<number[] | undefined>(undefined)
  const rPinchPoint = useRef<number[] | undefined>(undefined)

  const { callbacks } = useTLContext()

  useGesture(
    {
      onWheel: ({ event, delta }) => {
        if (event.ctrlKey) {
          const info = inputs.wheel(event as WheelEvent)
          callbacks.onZoom?.({ ...info, delta })
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        callbacks.onPan?.({ ...inputs.pointer!, delta: Vec.round(delta) })
      },
      onPinch: ({ pinching, da, origin }) => {
        if (!pinching) {
          const info = inputs.pinch(origin, origin)
          callbacks.onPinchEnd?.(info)
          rPinchDa.current = undefined
          rPinchPoint.current = undefined
          return
        }

        if (rPinchPoint.current === undefined) {
          const info = inputs.pinch(origin, origin)
          callbacks.onPinchStart?.(info)
          rPinchDa.current = da
          rPinchPoint.current = origin
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const [distanceDelta] = Vec.sub(rPinchDa.current!, da)

        const info = inputs.pinch(rPinchPoint.current, origin)

        // Naming things is hard
        callbacks.onPinch?.({
          ...info,
          point: origin,
          origin: rPinchPoint.current,
          delta: [0, distanceDelta],
        })

        rPinchDa.current = da
        rPinchPoint.current = origin
      },
    },
    {
      domTarget: typeof document === 'undefined' ? undefined : document.body,
      eventOptions: { passive: false },
    },
  )
}
