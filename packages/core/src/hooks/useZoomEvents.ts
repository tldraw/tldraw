/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as React from 'react'
import { useTLContext } from './useTLContext'
import { Vec } from '+utils'
import { useWheel, usePinch } from 'react-use-gesture'

// Capture zoom gestures (pinches, wheels and pans)
export function useZoomEvents<T extends HTMLElement | SVGElement>(ref: React.RefObject<T>) {
  const rPinchDa = React.useRef<number[] | undefined>(undefined)
  const rOriginPoint = React.useRef<number[] | undefined>(undefined)
  const rPinchPoint = React.useRef<number[] | undefined>(undefined)

  const { inputs, callbacks } = useTLContext()

  useWheel(
    ({ event: e, delta }) => {
      const elm = ref.current
      if (!(e.target === elm || elm?.contains(e.target as Node))) return

      e.preventDefault()

      if (Vec.isEqual(delta, [0, 0])) return

      const info = inputs.pan(delta, e as WheelEvent)

      callbacks.onPan?.(info, e)
    },
    {
      domTarget: window,
      eventOptions: { passive: false },
    }
  )

  usePinch(
    ({ pinching, da, origin, event: e }) => {
      const elm = ref.current
      if (!(e.target === elm || elm?.contains(e.target as Node))) return

      const info = inputs.pinch(origin, origin)

      if (!pinching) {
        inputs.isPinching = false
        callbacks.onPinchEnd?.(
          info,
          e as React.WheelEvent<Element> | WheelEvent | React.TouchEvent<Element> | TouchEvent
        )
        rPinchDa.current = undefined
        rPinchPoint.current = undefined
        rOriginPoint.current = undefined
        return
      }

      if (rPinchPoint.current === undefined) {
        inputs.isPinching = true
        callbacks.onPinchStart?.(
          info,
          e as React.WheelEvent<Element> | WheelEvent | React.TouchEvent<Element> | TouchEvent
        )
        rPinchDa.current = da
        rPinchPoint.current = info.point
        rOriginPoint.current = info.point
      }

      if (!rPinchDa.current) throw Error('No pinch direction!')
      if (!rOriginPoint.current) throw Error('No origin point!')

      const [distanceDelta] = Vec.sub(rPinchDa.current, da)

      callbacks.onPinch?.(
        {
          ...info,
          point: origin,
          origin: rOriginPoint.current,
          delta: [...info.delta, distanceDelta],
        },
        e as React.WheelEvent<Element> | WheelEvent | React.TouchEvent<Element> | TouchEvent
      )

      rPinchDa.current = da
      rPinchPoint.current = origin
    },
    {
      domTarget: window,
      eventOptions: { passive: false },
    }
  )
}
