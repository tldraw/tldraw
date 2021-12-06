import * as React from 'react'
import { useContext } from '~hooks'
import { TLNuPointerEventHandler, TLNuTargetType } from '~types'

export function useCanvasEvents() {
  const { inputs, callbacks } = useContext()

  const events = React.useMemo(() => {
    const onPointerMove: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      callbacks.onPointerMove?.({ type: TLNuTargetType.Canvas, target: 'canvas', order }, e)
    }

    const onPointerDown: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      e.currentTarget.setPointerCapture(e.pointerId)
      callbacks.onPointerDown?.({ type: TLNuTargetType.Canvas, target: 'canvas', order }, e)
    }

    const onPointerUp: TLNuPointerEventHandler = (e) => {
      const { order = 0 } = e
      e.currentTarget.releasePointerCapture(e.pointerId)
      callbacks.onPointerUp?.({ type: TLNuTargetType.Canvas, target: 'canvas', order }, e)
    }

    const onKeyDown: React.KeyboardEventHandler = (e) => {
      callbacks.onKeyDown?.({ type: TLNuTargetType.Canvas, target: 'canvas', order: -1 }, e)
    }

    const onKeyUp: React.KeyboardEventHandler = (e) => {
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
  }, [callbacks])

  return events
}
