import Vec from '@tldraw/vec'
import type { Handler, WebKitGestureEvent } from '@use-gesture/core/types'
import { useGesture } from '@use-gesture/react'
import * as React from 'react'
import { useContext } from '~hooks'
import { TLNuTargetType } from '~types'

type PinchHandler = Handler<'pinch', WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent>

export function useGestureEvents(ref: React.RefObject<HTMLDivElement>) {
  const { viewport, inputs, callbacks } = useContext()

  const handleWheel = React.useCallback<Handler<'wheel', WheelEvent>>(
    ({ delta, event: e }) => {
      e.preventDefault()
      if (Vec.isEqual(delta, [0, 0])) return

      viewport.panCamera(delta)
      inputs.onPointerMove([...viewport.getPagePoint([e.clientX, e.clientY]), 0.5], e)
      callbacks.onPan?.({ type: TLNuTargetType.Canvas, target: 'canvas', order: 0 }, e)
    },
    [viewport, inputs, callbacks.onPan]
  )

  const onPinchStart = React.useCallback<PinchHandler>(({ origin, event }) => {
    // const elm = ref.current
    // if (!elm || !(event.target === elm || elm.contains(event.target as Node))) return
    // const info = inputs.pinch(origin, origin)
    // inputs.isPinching = true
    // inputs.onPinchStart?.(info, event)
    // rPinchPoint.current = info.point
    // rOriginPoint.current = info.origin
    // rDelta.current = [0, 0]
  }, [])

  const onPinchEnd = React.useCallback<PinchHandler>(({ origin, event }) => {
    // const elm = ref.current
    // if (!(event.target === elm || elm?.contains(event.target as Node))) return
    // const info = inputs.pinch(origin, origin)
    // inputs.isPinching = false
    // callbacks.onPinchEnd?.(info, event)
    // rPinchPoint.current = undefined
    // rOriginPoint.current = undefined
    // rDelta.current = [0, 0]
  }, [])

  const onPinch = React.useCallback<PinchHandler>(({ origin, offset, event }) => {
    // const elm = ref.current
    // if (!(event.target === elm || elm?.contains(event.target as Node))) return
    // if (!rOriginPoint.current) return
    // const info = inputs.pinch(origin, rOriginPoint.current)
    // const trueDelta = Vec.sub(info.delta, rDelta.current)
    // rDelta.current = info.delta
    // callbacks.onPinch?.(
    //   {
    //     ...info,
    //     point: info.point,
    //     origin: rOriginPoint.current,
    //     delta: [...trueDelta, offset[0]],
    //   },
    //   event
    // )
    // rPinchPoint.current = origin
  }, [])

  useGesture(
    {
      onWheel: handleWheel,
      onPinch,
      onPinchStart,
      onPinchEnd,
    },
    {
      target: ref,
      eventOptions: { passive: false },
      pinch: {
        from: viewport.camera.zoom,
        scaleBounds: () => ({ from: viewport.camera.zoom, max: 5, min: 0.1 }),
      },
    }
  )
}
