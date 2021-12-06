import Vec from '@tldraw/vec'
import type { Handler, WebKitGestureEvent } from '@use-gesture/core/types'
import { useGesture } from '@use-gesture/react'
import * as React from 'react'
import { useContext } from '~hooks'
import { TLNuTargetType } from '~types'

type PinchHandler = Handler<'pinch', WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent>

export function useGestureEvents(ref: React.RefObject<HTMLDivElement>) {
  const { viewport, inputs, callbacks } = useContext()

  const events = React.useMemo(() => {
    const onWheel: Handler<'wheel', WheelEvent> = (gesture) => {
      const { event, delta } = gesture
      event.preventDefault()
      if (inputs.state === 'pinching') return
      if (Vec.isEqual(delta, [0, 0])) return
      callbacks.onWheel?.(
        { type: TLNuTargetType.Canvas, target: 'canvas', order: 0 },
        gesture,
        event
      )
    }

    const onPinchStart: PinchHandler = (gesture) => {
      const elm = ref.current
      const { event } = gesture
      if (!(event.target === elm || elm?.contains(event.target as Node))) return
      if (inputs.state !== 'idle') return
      callbacks.onPinchStart?.(
        { type: TLNuTargetType.Canvas, target: 'canvas', order: 0 },
        gesture,
        event
      )
    }

    const onPinch: PinchHandler = (gesture) => {
      const elm = ref.current
      const { event } = gesture
      if (!(event.target === elm || elm?.contains(event.target as Node))) return
      if (inputs.state !== 'pinching') return
      callbacks.onPinch?.(
        { type: TLNuTargetType.Canvas, target: 'canvas', order: 0 },
        gesture,
        event
      )
    }

    const onPinchEnd: PinchHandler = (gesture) => {
      const elm = ref.current
      const { event } = gesture
      if (!(event.target === elm || elm?.contains(event.target as Node))) return
      setTimeout(() => {
        if (inputs.state !== 'pinching') return
        callbacks.onPinchEnd?.(
          { type: TLNuTargetType.Canvas, target: 'canvas', order: 0 },
          gesture,
          event
        )
      }, 100)
    }

    return {
      onWheel,
      onPinchStart,
      onPinchEnd,
      onPinch,
    }
  }, [callbacks])

  useGesture(events, {
    target: ref,
    eventOptions: { passive: false },
    pinch: {
      from: viewport.camera.zoom,
      scaleBounds: () => ({ from: viewport.camera.zoom, max: 8, min: 0.1 }),
    },
  })
}
