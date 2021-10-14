/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as React from 'react'
import { useTLContext } from './useTLContext'
import { useGesture, usePinch, useWheel } from '@use-gesture/react'
import { Vec } from '@tldraw/vec'

// Capture zoom gestures (pinches, wheels and pans)
export function useZoomEvents<T extends HTMLElement>(zoom: number, ref: React.RefObject<T>) {
  const rOriginPoint = React.useRef<number[] | undefined>(undefined)
  const rPinchPoint = React.useRef<number[] | undefined>(undefined)
  const rDelta = React.useRef<number[]>([0, 0])

  const { inputs, callbacks } = useTLContext()

  React.useEffect(() => {
    const preventGesture = (event: TouchEvent) => {
      event.preventDefault()
    }

    // @ts-ignore
    document.addEventListener('gesturestart', preventGesture)
    // @ts-ignore
    document.addEventListener('gesturechange', preventGesture)

    return () => {
      // @ts-ignore
      document.removeEventListener('gesturestart', preventGesture)
      // @ts-ignore
      document.removeEventListener('gesturechange', preventGesture)
    }
  }, [])

  React.useEffect(() => {
    const elm = ref.current

    function handleWheel(e: WheelEvent) {
      if (e.altKey) {
        const point = inputs.pointer?.point ?? [inputs.bounds.width / 2, inputs.bounds.height / 2]

        const info = inputs.pinch(point, point)

        callbacks.onZoom?.({ ...info, delta: [...point, e.deltaY] }, e)
        return
      }

      e.preventDefault()

      if (inputs.isPinching) return

      if (Vec.isEqual([e.deltaX, e.deltaY], [0, 0])) return

      const info = inputs.pan([e.deltaX, e.deltaY], e as WheelEvent)

      callbacks.onPan?.(info, e)
    }

    elm?.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      elm?.removeEventListener('wheel', handleWheel)
    }
  }, [ref, callbacks, inputs])

  useGesture(
    {
      onPinchStart: ({ origin, event }) => {
        const elm = ref.current

        if (!elm || !(event.target === elm || elm.contains(event.target as Node))) return

        const info = inputs.pinch(origin, origin)
        inputs.isPinching = true
        callbacks.onPinchStart?.(info, event)
        rPinchPoint.current = info.point
        rOriginPoint.current = info.origin
        rDelta.current = [0, 0]
      },
      onPinchEnd: ({ origin, event }) => {
        const elm = ref.current
        if (!(event.target === elm || elm?.contains(event.target as Node))) return

        const info = inputs.pinch(origin, origin)

        inputs.isPinching = false
        callbacks.onPinchEnd?.(info, event)
        rPinchPoint.current = undefined
        rOriginPoint.current = undefined
        rDelta.current = [0, 0]
      },
      onPinch: ({ origin, offset, event }) => {
        const elm = ref.current
        if (!(event.target === elm || elm?.contains(event.target as Node))) return
        if (!rOriginPoint.current) return

        const info = inputs.pinch(origin, rOriginPoint.current)

        const trueDelta = Vec.sub(info.delta, rDelta.current)

        rDelta.current = info.delta

        callbacks.onPinch?.(
          {
            ...info,
            point: info.point,
            origin: rOriginPoint.current,
            delta: [...trueDelta, offset[0]],
          },
          event
        )

        rPinchPoint.current = origin
      },
    },
    {
      target: ref,
      eventOptions: { passive: false },
      pinch: {
        from: zoom,
        scaleBounds: () => ({ from: inputs.zoom, max: 5, min: 0.1 }),
      },
    }
  )
}
