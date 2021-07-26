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
          callbacks.onZoom?.({ ...info, delta: delta[1] })
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        callbacks.onPan?.({ ...inputs.pointer!, delta: Vec.round(delta) })
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

        const info = inputs.pinch(rPinchPoint.current, origin)

        callbacks.onPinch?.({ ...info, distanceDelta })

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
