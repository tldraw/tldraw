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
      onWheel: ({ event: e, delta }) => {
        const info = inputs.pan(delta, e as WheelEvent)

        if (e.ctrlKey) {
          callbacks.onZoom?.(info, e)
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        callbacks.onPan?.(info, e)
      },
      onPinch: ({ pinching, da, origin, event: e }) => {
        if (!pinching) {
          const info = inputs.pinch(origin, origin)
          callbacks.onPinchEnd?.(info, e as React.WheelEvent<Element> | WheelEvent | React.TouchEvent<Element> | TouchEvent)
          rPinchDa.current = undefined
          rPinchPoint.current = undefined
          return
        }

        if (rPinchPoint.current === undefined) {
          const info = inputs.pinch(origin, origin)
          callbacks.onPinchStart?.(info, e as React.WheelEvent<Element> | WheelEvent | React.TouchEvent<Element> | TouchEvent)
          rPinchDa.current = da
          rPinchPoint.current = origin
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const [distanceDelta] = Vec.sub(rPinchDa.current!, da)

        const info = inputs.pinch(rPinchPoint.current, origin)

        // Naming things is hard
        callbacks.onPinch?.(
          {
            ...info,
            point: origin,
            origin: rPinchPoint.current,
            delta: [...info.delta, distanceDelta],
          },
          e as React.WheelEvent<Element> | WheelEvent | React.TouchEvent<Element> | TouchEvent,
        )

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
