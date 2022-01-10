import * as React from 'react'
import { useTLContext } from './useTLContext'

export function useHandleEvents(id: string) {
  const { inputs, callbacks } = useTLContext()

  return React.useMemo(() => {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true
        if (!inputs.pointerIsValid(e)) return
        if (e.button !== 0) return
        if (!inputs.pointerIsValid(e)) return
        e.currentTarget?.setPointerCapture(e.pointerId)
        const info = inputs.pointerDown(e, id)
        callbacks.onPointHandle?.(info, e)
        callbacks.onPointerDown?.(info, e)
      },
      onPointerUp: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true
        if (e.button !== 0) return
        if (!inputs.pointerIsValid(e)) return
        const isDoubleClick = inputs.isDoubleClick()
        const info = inputs.pointerUp(e, id)
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget?.releasePointerCapture(e.pointerId)
          if (isDoubleClick && !(info.altKey || info.metaKey)) {
            callbacks.onDoubleClickHandle?.(info, e)
          }
          callbacks.onReleaseHandle?.(info, e)
        }
        callbacks.onPointerUp?.(info, e)
      },
      onPointerMove: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true
        if (!inputs.pointerIsValid(e)) return
        const info = inputs.pointerMove(e, id)
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          callbacks.onDragHandle?.(info, e)
        }
        callbacks.onPointerMove?.(info, e)
      },
      onPointerEnter: (e: React.PointerEvent) => {
        if (!inputs.pointerIsValid(e)) return
        const info = inputs.pointerEnter(e, id)
        callbacks.onHoverHandle?.(info, e)
      },
      onPointerLeave: (e: React.PointerEvent) => {
        if (!inputs.pointerIsValid(e)) return
        const info = inputs.pointerEnter(e, id)
        callbacks.onUnhoverHandle?.(info, e)
      },
    }
  }, [inputs, callbacks, id])
}
