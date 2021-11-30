import * as React from 'react'
import { useContext } from '~hooks'
import { TLNuBoundsHandle, TLNuTargetType } from '~types'

export function useBoundsEvents(handle: TLNuBoundsHandle) {
  const { viewport, inputs, callbacks } = useContext()

  const events = React.useMemo(() => {
    const onPointerMove: React.PointerEventHandler = (e) => {
      inputs.onPointerMove([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerMove?.({ type: TLNuTargetType.Bounds, target: handle, order: e.detail }, e)
      e.detail++
    }

    const onPointerDown: React.PointerEventHandler = (e) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      inputs.onPointerDown([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerDown?.({ type: TLNuTargetType.Bounds, target: handle, order: e.detail }, e)
      e.detail++
    }

    const onPointerUp: React.PointerEventHandler = (e) => {
      e.currentTarget.releasePointerCapture(e.pointerId)
      inputs.onPointerUp([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerUp?.({ type: TLNuTargetType.Bounds, target: handle, order: e.detail }, e)
      e.detail++
    }

    const onPointerEnter: React.PointerEventHandler = (e) => {
      callbacks.onPointerEnter?.(
        { type: TLNuTargetType.Bounds, target: handle, order: e.detail },
        e
      )
      e.detail++
    }

    const onPointerLeave: React.PointerEventHandler = (e) => {
      callbacks.onPointerLeave?.(
        { type: TLNuTargetType.Bounds, target: handle, order: e.detail },
        e
      )
      e.detail++
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
