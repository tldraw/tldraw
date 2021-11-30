import * as React from 'react'
import { useContext } from '~hooks'
import { TLNuTargetType } from '~types'

export function useCanvasEvents() {
  const { viewport, inputs, callbacks } = useContext()

  const events = React.useMemo(() => {
    const onPointerMove: React.PointerEventHandler = (e) => {
      inputs.onPointerMove([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerMove?.(
        { type: TLNuTargetType.Canvas, target: 'canvas', order: e.detail },
        e
      )
    }

    const onPointerDown: React.PointerEventHandler = (e) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      inputs.onPointerDown([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerDown?.(
        { type: TLNuTargetType.Canvas, target: 'canvas', order: e.detail },
        e
      )
    }

    const onPointerUp: React.PointerEventHandler = (e) => {
      e.currentTarget.releasePointerCapture(e.pointerId)
      inputs.onPointerUp([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerUp?.({ type: TLNuTargetType.Canvas, target: 'canvas', order: e.detail }, e)
    }

    const onKeyDown: React.KeyboardEventHandler = (e) => {
      inputs.onKeyDown(e)
      callbacks.onKeyDown?.({ type: TLNuTargetType.Canvas, target: 'canvas', order: e.detail }, e)
    }

    const onKeyUp: React.KeyboardEventHandler = (e) => {
      inputs.onKeyUp(e)
      callbacks.onKeyUp?.({ type: TLNuTargetType.Canvas, target: 'canvas', order: e.detail }, e)
    }

    const onPointerEnter: React.PointerEventHandler = (e) => {
      callbacks.onPointerEnter?.(
        { type: TLNuTargetType.Canvas, target: 'canvas', order: e.detail },
        e
      )
    }

    const onPointerLeave: React.PointerEventHandler = (e) => {
      callbacks.onPointerLeave?.(
        { type: TLNuTargetType.Canvas, target: 'canvas', order: e.detail },
        e
      )
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
