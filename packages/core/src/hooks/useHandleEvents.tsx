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

        // On left click down
        if (e.button === 2) {
          return
        }

        e.currentTarget?.setPointerCapture(e.pointerId)

        const info = inputs.pointerDown(e, id)

        // On left click down
        if (e.button === 0) {
          callbacks.onPointHandle?.(info, e)
        }

        // On left or middle click down
        callbacks.onPointerDown?.(info, e)
      },
      onPointerUp: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true

        if (!inputs.pointerIsValid(e)) return

        // Right click up
        if (e.button === 2) {
          return
        }

        const isDoubleClick = inputs.isDoubleClick()
        const info = inputs.pointerUp(e, id)

        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget?.releasePointerCapture(e.pointerId)

          // On left click up
          if (e.button === 0) {
            if (isDoubleClick && !(info.altKey || info.metaKey)) {
              callbacks.onDoubleClickHandle?.(info, e)
            }
            callbacks.onReleaseHandle?.(info, e)
          }
        }

        // On any click up
        callbacks.onPointerUp?.(info, e)
      },
      onPointerMove: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true
        if (!inputs.pointerIsValid(e)) return
        // On right click drag
        if (e.buttons === 2) {
          return
        }

        const info = inputs.pointerMove(e, id)

        // On left click drag
        if (e.buttons === 1) {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            callbacks.onDragHandle?.(info, e)
          }
        }

        // On left or middle click drag
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
