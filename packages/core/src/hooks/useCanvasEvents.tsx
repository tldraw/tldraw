import * as React from 'react'
import { useTLContext } from './useTLContext'

export function useCanvasEvents() {
  const { callbacks, inputs } = useTLContext()

  return React.useMemo(() => {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true
        if (!inputs.pointerIsValid(e)) return

        // On right click
        if (e.button === 2) {
          callbacks.onRightPointCanvas?.(inputs.pointerDown(e, 'canvas'), e)
          return
        }

        e.currentTarget.setPointerCapture(e.pointerId)

        const info = inputs.pointerDown(e, 'canvas')

        // On left click down
        if (e.button === 0) {
          callbacks.onPointCanvas?.(info, e)
        }

        // On left or middle click down
        callbacks.onPointerDown?.(info, e)
      },
      onPointerMove: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true

        if (!inputs.pointerIsValid(e)) return

        const info = inputs.pointerMove(e, 'canvas')

        // On left click drag
        if (e.buttons === 1) {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            callbacks.onDragCanvas?.(info, e)
          }
        }

        // On left or middle click drag
        callbacks.onPointerMove?.(info, e)
      },
      onPointerUp: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true

        inputs.activePointer = undefined
        if (!inputs.pointerIsValid(e)) return

        // On right click up
        if (e.button === 2) {
          return
        }

        const info = inputs.pointerUp(e, 'canvas')

        const isDoubleClick = inputs.isDoubleClick()

        // Release pointer capture, if any
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget?.releasePointerCapture(e.pointerId)
        }

        // On left click up
        if (e.button === 0) {
          if (isDoubleClick && !(info.altKey || info.metaKey)) {
            callbacks.onDoubleClickCanvas?.(info, e)
          }

          callbacks.onReleaseCanvas?.(info, e)
        }

        // On left or middle click up
        callbacks.onPointerUp?.(info, e)
      },
      onDrop: callbacks.onDrop,
      onDragOver: callbacks.onDragOver,
    }
  }, [callbacks, inputs])
}
