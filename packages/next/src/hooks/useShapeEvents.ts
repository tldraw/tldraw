import * as React from 'react'
import { useContext } from '~hooks'
import type { TLNuShape } from '~nu-lib'
import { TLNuPointerEventHandler, TLNuTargetType } from '~types'

export function useShapeEvents(shape: TLNuShape) {
  const { inputs, callbacks } = useContext()

  const events = React.useMemo(() => {
    const onPointerMove: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      callbacks.onPointerMove?.({ type: TLNuTargetType.Shape, target: shape, order }, e)
      e.order = order + 1
    }

    const onPointerDown: TLNuPointerEventHandler = (e) => {
      const { order = 0, didPassThroughBounds } = e
      if (e.order === 0) e.currentTarget.setPointerCapture(e.pointerId)
      callbacks.onPointerDown?.(
        { type: TLNuTargetType.Shape, target: shape, order, didPassThroughBounds },
        e
      )
      e.order = order + 1
    }

    const onPointerUp: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      if (e.order === 0) e.currentTarget.releasePointerCapture(e.pointerId)
      callbacks.onPointerUp?.({ type: TLNuTargetType.Shape, target: shape, order }, e)
      e.order = order + 1
    }

    const onPointerEnter: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      callbacks.onPointerEnter?.({ type: TLNuTargetType.Shape, target: shape, order }, e)
      e.order = order + 1
    }

    const onPointerLeave: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      callbacks.onPointerLeave?.({ type: TLNuTargetType.Shape, target: shape, order }, e)
      e.order = order + 1
    }

    const onKeyDown: React.KeyboardEventHandler = (e) => {
      callbacks.onKeyDown?.({ type: TLNuTargetType.Shape, target: shape, order: -1 }, e)
    }

    const onKeyUp: React.KeyboardEventHandler = (e) => {
      callbacks.onKeyUp?.({ type: TLNuTargetType.Shape, target: shape, order: -1 }, e)
    }

    return {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerEnter,
      onPointerLeave,
      onKeyUp,
      onKeyDown,
    }
  }, [shape.id, inputs, callbacks])

  return events
}
