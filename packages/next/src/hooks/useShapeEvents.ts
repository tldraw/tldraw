import * as React from 'react'
import { useContext } from '~hooks'
import type { TLNuShape } from '~nu-lib'
import { TLNuPointerEventHandler, TLNuTargetType } from '~types'

export function useShapeEvents(shape: TLNuShape) {
  const { viewport, inputs, callbacks } = useContext()

  const events = React.useMemo(() => {
    const onPointerMove: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      inputs.onPointerMove([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerMove?.({ type: TLNuTargetType.Shape, target: shape, order }, e)
      e.order = order + 1
    }

    const onPointerDown: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      if (e.order === 0) e.currentTarget.setPointerCapture(e.pointerId)
      inputs.onPointerDown([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerDown?.({ type: TLNuTargetType.Shape, target: shape, order }, e)
      e.order = order + 1
    }

    const onPointerUp: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      if (e.order === 0) e.currentTarget.releasePointerCapture(e.pointerId)
      inputs.onPointerUp([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
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
      inputs.onKeyDown(e)
      callbacks.onKeyDown?.({ type: TLNuTargetType.Shape, target: shape, order: -1 }, e)
    }

    const onKeyUp: React.KeyboardEventHandler = (e) => {
      inputs.onKeyUp(e)
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
