import * as React from 'react'
import { useTLContext } from './useTLContext'

export function useBoundsEvents() {
  const { callbacks, inputs } = useTLContext()

  return React.useMemo(() => {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true
        if (!inputs.pointerIsValid(e)) return

        // On right click
        if (e.button === 2) {
          callbacks.onRightPointBounds?.(inputs.pointerDown(e, 'bounds'), e)
          return
        }

        const info = inputs.pointerDown(e, 'bounds')
        e.currentTarget?.setPointerCapture(e.pointerId)

        // On left click
        if (e.button === 0) {
          callbacks.onPointBounds?.(info, e)
        }

        // On left or middle click
        callbacks.onPointerDown?.(info, e)
      },
      onPointerUp: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true

        // On right click
        if (e.button === 2) {
          return
        }

        inputs.activePointer = undefined

        if (!inputs.pointerIsValid(e)) return

        const isDoubleClick = inputs.isDoubleClick()

        const info = inputs.pointerUp(e, 'bounds')

        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget?.releasePointerCapture(e.pointerId)
        }

        // On left click up
        if (e.button === 0) {
          // On double click
          if (isDoubleClick && !(info.altKey || info.metaKey)) {
            callbacks.onDoubleClickBounds?.(info, e)
          }

          callbacks.onReleaseBounds?.(info, e)
        }

        // On left or middle click up
        callbacks.onPointerUp?.(info, e)
      },
      onPointerMove: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true
        if (!inputs.pointerIsValid(e)) return

        // On left click move
        if (e.buttons === 1) {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            callbacks.onDragBounds?.(inputs.pointerMove(e, 'bounds'), e)
          }
        }

        const info = inputs.pointerMove(e, 'bounds')
        callbacks.onPointerMove?.(info, e)
      },
      onPointerEnter: (e: React.PointerEvent) => {
        if (!inputs.pointerIsValid(e)) return
        callbacks.onHoverBounds?.(inputs.pointerEnter(e, 'bounds'), e)
      },
      onPointerLeave: (e: React.PointerEvent) => {
        if (!inputs.pointerIsValid(e)) return
        callbacks.onUnhoverBounds?.(inputs.pointerEnter(e, 'bounds'), e)
      },
    }
  }, [inputs, callbacks])
}
