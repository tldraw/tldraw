import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { TLNuBounds, TLNuTargetType } from '~types'
import { useContext } from '~hooks/useContext'

interface BoundsBgProps {
  bounds: TLNuBounds
}

export const BoundsBg = observer(function BoundsBg({ bounds }: BoundsBgProps) {
  const { viewport, inputs, callbacks } = useContext()

  const events = React.useMemo(() => {
    const onPointerMove: React.PointerEventHandler = (e) => {
      inputs.onPointerMove([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerMove?.(
        { type: TLNuTargetType.Bounds, target: 'center', order: e.detail },
        e
      )
      e.detail++
    }

    const onPointerDown: React.PointerEventHandler = (e) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      inputs.onPointerDown([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerDown?.(
        { type: TLNuTargetType.Bounds, target: 'center', order: e.detail },
        e
      )
      e.detail++
    }

    const onPointerUp: React.PointerEventHandler = (e) => {
      e.currentTarget.releasePointerCapture(e.pointerId)
      inputs.onPointerUp([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerUp?.({ type: TLNuTargetType.Bounds, target: 'center', order: e.detail }, e)
      e.detail++
    }

    const onPointerEnter: React.PointerEventHandler = (e) => {
      callbacks.onPointerEnter?.(
        { type: TLNuTargetType.Bounds, target: 'center', order: e.detail },
        e
      )
      e.detail++
    }

    const onPointerLeave: React.PointerEventHandler = (e) => {
      callbacks.onPointerLeave?.(
        { type: TLNuTargetType.Bounds, target: 'center', order: e.detail },
        e
      )
      e.detail++
    }

    const onKeyDown: React.KeyboardEventHandler = (e) => {
      inputs.onKeyDown(e)
      callbacks.onKeyDown?.({ type: TLNuTargetType.Bounds, target: 'center', order: e.detail }, e)
      e.detail++
    }

    const onKeyUp: React.KeyboardEventHandler = (e) => {
      inputs.onKeyUp(e)
      callbacks.onKeyUp?.({ type: TLNuTargetType.Bounds, target: 'center', order: e.detail }, e)
      e.detail++
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
  }, [inputs, callbacks])

  return (
    <rect
      className="nu-bounds-bg"
      x={bounds.minX}
      y={bounds.minY}
      width={bounds.width}
      height={bounds.height}
      pointerEvents="all"
      {...events}
    />
  )
})
