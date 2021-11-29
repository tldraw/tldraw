import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { Container } from '~components/Container'
import type { TLNuShape } from '~nu-lib'
import { useContext } from '~hooks/useContext'
import { TLNuTargetType } from '~types'

interface ShapeProps<S extends TLNuShape = TLNuShape> {
  shape: S
  zIndex: number
}

export const Shape = observer(function Shape({ shape, zIndex }: ShapeProps) {
  const { bounds, Component } = shape

  const { viewport, inputs, callbacks } = useContext()

  const events = React.useMemo(() => {
    const onPointerMove: React.PointerEventHandler = (e) => {
      inputs.onPointerMove([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerMove?.({ type: TLNuTargetType.Shape, target: shape, order: e.detail }, e)
      e.detail++
    }

    const onPointerDown: React.PointerEventHandler = (e) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      inputs.onPointerDown([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerDown?.({ type: TLNuTargetType.Shape, target: shape, order: e.detail }, e)
      e.detail++
    }

    const onPointerUp: React.PointerEventHandler = (e) => {
      e.currentTarget.releasePointerCapture(e.pointerId)
      inputs.onPointerUp([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerUp?.({ type: TLNuTargetType.Shape, target: shape, order: e.detail }, e)
      e.detail++
    }

    const onPointerEnter: React.PointerEventHandler = (e) => {
      callbacks.onPointerEnter?.({ type: TLNuTargetType.Shape, target: shape, order: e.detail }, e)
      e.detail++
    }

    const onPointerLeave: React.PointerEventHandler = (e) => {
      callbacks.onPointerLeave?.({ type: TLNuTargetType.Shape, target: shape, order: e.detail }, e)
      e.detail++
    }

    const onKeyDown: React.KeyboardEventHandler = (e) => {
      inputs.onKeyDown(e)
      callbacks.onKeyDown?.({ type: TLNuTargetType.Shape, target: shape, order: e.detail }, e)
      e.detail++
    }

    const onKeyUp: React.KeyboardEventHandler = (e) => {
      inputs.onKeyUp(e)
      callbacks.onKeyUp?.({ type: TLNuTargetType.Shape, target: shape, order: e.detail }, e)
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
  }, [shape.id, inputs, callbacks])

  return (
    <Container bounds={bounds} zIndex={zIndex}>
      <Component
        meta={null}
        isEditing={false}
        isBinding={false}
        isHovered={false}
        isSelected={false}
        events={events}
      />
    </Container>
  )
})
