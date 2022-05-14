/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as React from 'react'
import { useTLContext } from './useTLContext'
import { Handler, useGesture, WebKitGestureEvent } from '@use-gesture/react'
import { Vec } from '@tldraw/vec'
import Utils from '~utils'

// Capture zoom gestures (pinches, wheels and pans)
export function useZoomEvents<T extends HTMLElement>(zoom: number, ref: React.RefObject<T>) {
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

      const { offset } = normalizeWheel(e)

      // alt+scroll or ctrl+scroll = zoom
      if ((e.altKey || e.ctrlKey || e.metaKey) && e.buttons === 0) {
        const point = inputs.pointer?.point ?? [bounds.width / 2, bounds.height / 2]
        const delta = [...point, offset[1]]
        const info = inputs.pan(delta, e)
        callbacks.onZoom?.({ ...info, delta }, e)
        return
      }
      // otherwise pan
      const delta = Vec.mul(
        e.shiftKey && !Utils.isDarwin
          ? // shift+scroll = pan horizontally
            [offset[1], 0]
          : // scroll = pan vertically (or in any direction on a trackpad)
            [...offset],
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
        from: [0, zoom],
        scaleBounds: () => ({ from: inputs.zoom, max: 5, min: 0.1 }),
      },
    }
  )
}

// Reasonable defaults
const PIXEL_STEP = 10
const LINE_HEIGHT = 40
const PAGE_HEIGHT = 800

function normalizeWheel(event: any) {
  let sX = 0,
    sY = 0, // spinX, spinY
    pX = 0,
    pY = 0 // pixelX, pixelY

  // Legacy
  if ('detail' in event) sY = event.detail
  if ('wheelDelta' in event) sY = -event.wheelDelta / 120
  if ('wheelDeltaY' in event) sY = -event.wheelDeltaY / 120
  if ('wheelDeltaX' in event) sX = -event.wheelDeltaX / 120

  // side scrolling on FF with DOMMouseScroll
  if ('axis' in event && event.axis === event.HORIZONTAL_AXIS) {
    sX = sY
    sY = 0
  }

  pX = 'deltaX' in event ? event.deltaX : sX * PIXEL_STEP
  pY = 'deltaY' in event ? event.deltaY : sY * PIXEL_STEP

  if ((pX || pY) && event.deltaMode) {
    if (event.deltaMode == 1) {
      // delta in LINE units
      pX *= LINE_HEIGHT
      pY *= LINE_HEIGHT
    } else {
      // delta in PAGE units
      pX *= PAGE_HEIGHT
      pY *= PAGE_HEIGHT
    }
  }

  // Fall-back if spin cannot be determined
  if (pX && !sX) sX = pX < 1 ? -1 : 1
  if (pY && !sY) sY = pY < 1 ? -1 : 1
  return { spin: [sX, sY], offset: [pX, pY] }
}
