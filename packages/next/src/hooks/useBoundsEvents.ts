import * as React from 'react'
import { useContext } from '~hooks'
import { TLNuBoundsHandle, TLNuPointerEventHandler, TLNuTargetType } from '~types'

export function useBoundsEvents(handle: TLNuBoundsHandle) {
  const { viewport, inputs, callbacks } = useContext()

  const events = React.useMemo(() => {
    const onPointerMove: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      inputs.onPointerMove([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerMove?.({ type: TLNuTargetType.Bounds, target: handle, order }, e)
      e.order = order + 1
    }

    const onPointerDown: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      if (order) e.currentTarget.setPointerCapture(e.pointerId)
      inputs.onPointerDown([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerDown?.({ type: TLNuTargetType.Bounds, target: handle, order }, e)
      e.order = order + 1
    }

    const onPointerUp: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      if (order) e.currentTarget.releasePointerCapture(e.pointerId)
      inputs.onPointerUp([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerUp?.({ type: TLNuTargetType.Bounds, target: handle, order }, e)
      e.order = order + 1
    }

    const onPointerEnter: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      callbacks.onPointerEnter?.({ type: TLNuTargetType.Bounds, target: handle, order }, e)
      e.order = order + 1
    }

    const onPointerLeave: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      callbacks.onPointerLeave?.({ type: TLNuTargetType.Bounds, target: handle, order }, e)
      e.order = order + 1
    }

    return {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerEnter,
      onPointerLeave,
    }
  }, [inputs, callbacks])

  return events
}
