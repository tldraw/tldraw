import * as React from 'react'
import { inputs } from '~inputs'
import { useTLContext } from './useTLContext'
import { Utils } from '~utils'

export function useShapeEvents(id: string, disable = false) {
  const { rPageState, rScreenBounds, callbacks } = useTLContext()

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      if (disable) return

      const info = inputs.pointerDown(e, id)

      e.stopPropagation()
      e.currentTarget?.setPointerCapture(e.pointerId)

      // If we click "through" the selection bounding box to hit a shape that isn't selected,
      // treat the event as a bounding box click. Unfortunately there's no way I know to pipe
      // the event to the actual bounds background element.
      if (
        rScreenBounds.current &&
        Utils.pointInBounds(info.point, rScreenBounds.current) &&
        !rPageState.current.selectedIds.includes(id)
      ) {
        callbacks.onPointBounds?.(inputs.pointerDown(e, 'bounds'), e)
        callbacks.onPointShape?.(info, e)
        return
      }

      callbacks.onPointShape?.(info, e)
      callbacks.onPointerDown?.(info, e)
    },
    [callbacks, id, disable]
  )

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      if (disable) return
      e.stopPropagation()
      const isDoubleClick = inputs.isDoubleClick()
      const info = inputs.pointerUp(e, id)

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget?.releasePointerCapture(e.pointerId)
      }

      if (isDoubleClick && !(info.altKey || info.metaKey)) {
        callbacks.onDoubleClickShape?.(info, e)
      }

      callbacks.onReleaseShape?.(info, e)
      callbacks.onPointerUp?.(info, e)
    },
    [callbacks, id, disable]
  )

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (disable) return
      e.stopPropagation()

      if (inputs.pointer && e.pointerId !== inputs.pointer.pointerId) return

      const info = inputs.pointerMove(e, id)

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        callbacks.onDragShape?.(info, e)
      }

      callbacks.onPointerMove?.(info, e)
    },
    [callbacks, id, disable]
  )

  const onPointerEnter = React.useCallback(
    (e: React.PointerEvent) => {
      if (disable) return
      const info = inputs.pointerEnter(e, id)
      callbacks.onHoverShape?.(info, e)
    },
    [callbacks, id, disable]
  )

  const onPointerLeave = React.useCallback(
    (e: React.PointerEvent) => {
      if (disable) return
      const info = inputs.pointerEnter(e, id)
      callbacks.onUnhoverShape?.(info, e)
    },
    [callbacks, id, disable]
  )

  const onTouchStart = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault()
  }, [])

  const onTouchEnd = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault()
  }, [])

  return {
    onPointerDown,
    onPointerUp,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
    onTouchStart,
    onTouchEnd,
  }
}
