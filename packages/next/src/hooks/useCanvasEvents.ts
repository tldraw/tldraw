import * as React from 'react'
import { useContext } from '~hooks'
import { TLNuPointerEventHandler, TLNuTargetType } from '~types'

export function useCanvasEvents() {
  const { viewport, inputs, callbacks } = useContext()

  const events = React.useMemo(() => {
    const onPointerMove: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      inputs.onPointerMove([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerMove?.({ type: TLNuTargetType.Canvas, target: 'canvas', order }, e)
    }

    const onPointerDown: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      e.currentTarget.setPointerCapture(e.pointerId)
      inputs.onPointerDown([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerDown?.({ type: TLNuTargetType.Canvas, target: 'canvas', order }, e)
    }

    const onPointerUp: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      e.currentTarget.releasePointerCapture(e.pointerId)
      inputs.onPointerUp([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerUp?.({ type: TLNuTargetType.Canvas, target: 'canvas', order }, e)
    }

    const onKeyDown: React.KeyboardEventHandler = (e) => {
      inputs.onKeyDown(e)
      callbacks.onKeyDown?.({ type: TLNuTargetType.Canvas, target: 'canvas', order: -1 }, e)
    }

    const onKeyUp: React.KeyboardEventHandler = (e) => {
      inputs.onKeyUp(e)
      callbacks.onKeyUp?.({ type: TLNuTargetType.Canvas, target: 'canvas', order: -1 }, e)
    }

    const onPointerEnter: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      callbacks.onPointerEnter?.({ type: TLNuTargetType.Canvas, target: 'canvas', order }, e)
    }

    const onPointerLeave: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      callbacks.onPointerLeave?.({ type: TLNuTargetType.Canvas, target: 'canvas', order }, e)
    }

    return {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onKeyDown,
      onKeyUp,
      onPointerEnter,
      onPointerLeave,
    }
  }, [inputs])

  return events
}
