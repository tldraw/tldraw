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
          const { point } = inputs.wheel(event as WheelEvent)
          callbacks.onZoom?.(point, delta[1])
          return
        }

        callbacks.onPan?.(delta)
      },
      onPinch: ({ pinching, da, origin }) => {
        if (!pinching) {
          callbacks.onPinchEnd?.(origin)
          rPinchDa.current = undefined
          rPinchPoint.current = undefined
          return
        }

        if (rPinchPoint.current === undefined) {
          callbacks.onPinchStart?.(origin)
          rPinchDa.current = da
          rPinchPoint.current = origin
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const [distanceDelta] = Vec.sub(rPinchDa.current!, da)

        const delta = Vec.sub(rPinchPoint.current, origin)

        callbacks.onPinch?.(origin, delta, distanceDelta)

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
