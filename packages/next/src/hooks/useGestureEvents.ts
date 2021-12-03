import Vec from '@tldraw/vec'
import type { Handler, WebKitGestureEvent } from '@use-gesture/core/types'
import { useGesture } from '@use-gesture/react'
import * as React from 'react'
import { useContext } from '~hooks'
import { TLNuTargetType } from '~types'

type PinchHandler = Handler<'pinch', WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent>

export function useGestureEvents(ref: React.RefObject<HTMLDivElement>) {
  const { viewport, inputs, callbacks } = useContext()

  const onWheel = React.useCallback<Handler<'wheel', WheelEvent>>(
    (gesture) => {
      const { event, delta } = gesture
      event.preventDefault()
      if (Vec.isEqual(delta, [0, 0])) {
        return
      }

      inputs.onWheel([...viewport.getPagePoint([event.clientX, event.clientY]), 0.5], event)
      callbacks.onWheel?.(
        { type: TLNuTargetType.Canvas, target: 'canvas', order: 0 },
        gesture,
        event
      )
    },
    [viewport, inputs, callbacks.onWheel]
  )

  const onPinchStart = React.useCallback<PinchHandler>(
    (gesture) => {
      const elm = ref.current
      const { event, origin } = gesture
      if (!(event.target === elm || elm?.contains(event.target as Node))) return
      if (inputs.state !== 'idle') return
      inputs.onPinchStart([...viewport.getPagePoint(origin), 0.5], event)
      callbacks.onPinchStart?.(
        { type: TLNuTargetType.Canvas, target: 'canvas', order: 0 },
        gesture,
        event
      )
    },
    [viewport, inputs, callbacks.onPinch]
  )

  const onPinch = React.useCallback<PinchHandler>(
    (gesture) => {
      const elm = ref.current
      const { event, origin } = gesture
      if (!(event.target === elm || elm?.contains(event.target as Node))) return
      if (inputs.state !== 'pinching') return
      inputs.onPinch([...viewport.getPagePoint(origin), 0.5], event)
      callbacks.onPinch?.(
        { type: TLNuTargetType.Canvas, target: 'canvas', order: 0 },
        gesture,
        event
      )
    },
    [viewport, inputs, callbacks.onPinch]
  )

  const onPinchEnd = React.useCallback<PinchHandler>(
    (gesture) => {
      const elm = ref.current
      const { event, origin } = gesture
      if (!(event.target === elm || elm?.contains(event.target as Node))) return
      setTimeout(() => {
        if (inputs.state !== 'pinching') return
        inputs.onPinchEnd([...viewport.getPagePoint(origin), 0.5], event)
        callbacks.onPinchEnd?.(
          { type: TLNuTargetType.Canvas, target: 'canvas', order: 0 },
          gesture,
          event
        )
      }, 100)
    },
    [viewport, inputs, callbacks.onPinchEnd]
  )

  useGesture(
    {
      onWheel,
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
