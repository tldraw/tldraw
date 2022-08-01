import { Vec } from '@tldraw/vec'
import { Handler, WebKitGestureEvent, useGesture } from '@use-gesture/react'
import * as React from 'react'
import Utils from '~utils'
import { useTLContext } from './useTLContext'

// Capture zoom gestures (pinches, wheels and pans)
export function useZoomEvents<T extends HTMLElement>(
  zoomRef: React.RefObject<number>,
  ref: React.RefObject<T>
) {
  const rOriginPoint = React.useRef<number[] | undefined>(undefined)
  const rPinchPoint = React.useRef<number[] | undefined>(undefined)
  const rDelta = React.useRef<number[]>([0, 0])

  const { inputs, bounds, callbacks } = useTLContext()

  React.useEffect(() => {
    const preventGesture = (event: TouchEvent) => event.preventDefault()
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

  const handleWheel = React.useCallback<Handler<'wheel', WheelEvent>>(
    ({ event: e }) => {
      e.preventDefault()
      if (inputs.isPinching) return

      const [x, y, z] = normalizeWheel(e)

      // alt+scroll or ctrl+scroll = zoom
      if ((e.altKey || e.ctrlKey || e.metaKey) && e.buttons === 0) {
        const point = inputs.pointer?.point ?? [bounds.width / 2, bounds.height / 2]
        const delta = [...point, z * 0.618]
        const info = inputs.pan(delta, e)

        callbacks.onZoom?.({ ...info, delta }, e)
        return
      }

      // otherwise pan
      const delta = Vec.mul(
        e.shiftKey && !Utils.isDarwin
          ? // shift+scroll = pan horizontally
            [y, 0]
          : // scroll = pan vertically (or in any direction on a trackpad)
            [x, y],
        0.5
      )

      if (Vec.isEqual(delta, [0, 0])) return

      const info = inputs.pan(delta, e)

      callbacks.onPan?.(info, e)
    },
    [callbacks, inputs, bounds]
  )

  const handlePinchStart = React.useCallback<
    Handler<'pinch', WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent>
  >(
    ({ origin, event }) => {
      if (event instanceof WheelEvent) return

      const elm = ref.current
      if (!elm || !(event.target === elm || elm.contains(event.target as Node))) return
      const info = inputs.pinch(origin, origin)
      inputs.isPinching = true
      callbacks.onPinchStart?.(info, event)
      rPinchPoint.current = info.point
      rOriginPoint.current = info.origin
      rDelta.current = [0, 0]
    },
    [callbacks, inputs, bounds]
  )

  const handlePinch = React.useCallback<
    Handler<'pinch', WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent>
  >(
    ({ origin, offset, event }) => {
      if (event instanceof WheelEvent) return

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
    [callbacks, inputs, bounds]
  )

  const handlePinchEnd = React.useCallback<
    Handler<'pinch', WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent>
  >(({ origin, event }) => {
    const elm = ref.current
    if (!(event.target === elm || elm?.contains(event.target as Node))) return
    const info = inputs.pinch(origin, origin)
    inputs.isPinching = false
    callbacks.onPinchEnd?.(info, event)
    rPinchPoint.current = undefined
    rOriginPoint.current = undefined
    rDelta.current = [0, 0]
  }, [])

  useGesture(
    {
      onWheel: handleWheel,
      onPinchStart: handlePinchStart,
      onPinch: handlePinch,
      onPinchEnd: handlePinchEnd,
    },
    {
      target: ref,
      eventOptions: { passive: false },
      pinch: {
        from: [zoomRef.current!, 0],
        scaleBounds: () => {
          return { from: zoomRef.current!, max: 5, min: 0.1 }
        },
      },
    }
  )
}

// Reasonable defaults
const MAX_ZOOM_STEP = 10

// Adapted from https://stackoverflow.com/a/13650579
function normalizeWheel(event: WheelEvent) {
  const { deltaY, deltaX } = event

  let deltaZ = 0

  if (event.ctrlKey || event.metaKey) {
    const signY = Math.sign(event.deltaY)
    const absDeltaY = Math.abs(event.deltaY)

    let dy = deltaY

    if (absDeltaY > MAX_ZOOM_STEP) {
      dy = MAX_ZOOM_STEP * signY
    }

    deltaZ = dy
  }

  return [deltaX, deltaY, deltaZ]
}
