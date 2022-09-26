import * as React from 'react'
import { TLContext } from '~hooks'
import { Utils } from '~utils'

export function useShapeEvents(id: string) {
  const { rPageState, rSelectionBounds, callbacks, inputs } = React.useContext(TLContext)

  return React.useMemo(
    () => ({
      onPointerDown: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true

        if (!inputs.pointerIsValid(e)) return

        // On right click
        if (e.button === 2) {
          callbacks.onRightPointShape?.(inputs.pointerDown(e, id), e)
          return
        }

        const info = inputs.pointerDown(e, id)

        e.currentTarget?.setPointerCapture(e.pointerId)

        // If we click "through" the selection bounding box to hit a shape that isn't selected,
        // treat the event as a bounding box click. Unfortunately there's no way I know to pipe
        // the event to the actual bounds background element.
        if (
          rSelectionBounds.current &&
          Utils.pointInBounds(info.point, rSelectionBounds.current) &&
          !rPageState.current.selectedIds.includes(id)
        ) {
          // On left click through bounding box foreground
          if (e.button === 0) {
            callbacks.onPointBounds?.(inputs.pointerDown(e, 'bounds'), e)
            callbacks.onPointShape?.(info, e)
          }

          // On left or middle click through bounding box foreground
          callbacks.onPointerDown?.(info, e)
          return
        }

        // On left click
        if (e.button === 0) {
          callbacks.onPointShape?.(info, e)
        }

        // On middle click or more
        callbacks.onPointerDown?.(info, e)
      },
      onPointerUp: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true
        if (!inputs.pointerIsValid(e)) return

        // On right clicks
        if (e.button === 2) {
          return
        }

        inputs.activePointer = undefined

        const isDoubleClick = inputs.isDoubleClick()

        const info = inputs.pointerUp(e, id)

        // Release pointer capture, if any
        if (e.pointerId && e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget?.releasePointerCapture(e.pointerId)
        }

        // On left click up
        if (e.button === 0) {
          if (isDoubleClick && !(info.altKey || info.metaKey)) {
            callbacks.onDoubleClickShape?.(info, e)
          }
          callbacks.onReleaseShape?.(info, e)
        }

        // On left or middle click up
        callbacks.onPointerUp?.(info, e)
      },
      onPointerMove: (e: React.PointerEvent) => {
        if ((e as any).dead) return
        else (e as any).dead = true

        // On right click drag
        if (
          e.buttons === 2 ||
          !inputs.pointerIsValid(e) ||
          (inputs.pointer && e.pointerId !== inputs.pointer.pointerId)
        ) {
          return
        }

        const info = inputs.pointerMove(e, id)

        // On left click drag
        if (e.buttons === 1 && e.currentTarget.hasPointerCapture(e.pointerId)) {
          callbacks.onDragShape?.(info, e)
        }

        // Otherwise...
        callbacks.onPointerMove?.(info, e)
      },
      onPointerEnter: (e: React.PointerEvent) => {
        if (!inputs.pointerIsValid(e)) return
        const info = inputs.pointerEnter(e, id)
        callbacks.onHoverShape?.(info, e)
      },
      onPointerLeave: (e: React.PointerEvent) => {
        if (!inputs.pointerIsValid(e)) return
        const info = inputs.pointerEnter(e, id)
        callbacks.onUnhoverShape?.(info, e)
      },
    }),
    [inputs, callbacks, id]
  )
}
