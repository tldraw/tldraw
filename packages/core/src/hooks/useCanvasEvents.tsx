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
        if (e.button !== 0 && e.button !== 1) return
        if (!inputs.pointerIsValid(e)) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const info = inputs.pointerDown(e, 'canvas')
        if (e.button === 0 || e.button === 1) {
          callbacks.onPointCanvas?.(info, e)
          callbacks.onPointerDown?.(info, e)
        }
      },
      onPointerMove: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true
        if (!inputs.pointerIsValid(e)) return
        const info = inputs.pointerMove(e, 'canvas')
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          callbacks.onDragCanvas?.(info, e)
        }
        callbacks.onPointerMove?.(info, e)
      },
      onPointerUp: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true
        if (e.button !== 0 && e.button !== 1) return
        inputs.activePointer = undefined
        if (!inputs.pointerIsValid(e)) return
        const isDoubleClick = inputs.isDoubleClick()
        const info = inputs.pointerUp(e, 'canvas')
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget?.releasePointerCapture(e.pointerId)
        }
        if (isDoubleClick && !(info.altKey || info.metaKey)) {
          callbacks.onDoubleClickCanvas?.(info, e)
        }
        callbacks.onReleaseCanvas?.(info, e)
        callbacks.onPointerUp?.(info, e)
      },
      onDrop: callbacks.onDrop,
      onDragOver: callbacks.onDragOver,
    }
  }, [callbacks, inputs])
}
