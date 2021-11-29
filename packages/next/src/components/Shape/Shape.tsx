import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { Container } from '~components/Container'
import type { TLNuShape } from '~lib'
import { useContext } from '~hooks/useContext'

interface ShapeProps<S extends TLNuShape = TLNuShape> {
  shape: S
}

export const Shape = observer(function Shape({ shape }: ShapeProps) {
  const { bounds, Component } = shape

  const { inputs, callbacks } = useContext()

  const events = React.useMemo(() => {
    const info = { target: shape.id }

    const onPointerMove: React.PointerEventHandler = (e) => {
      inputs.onPointerMove(e)
      callbacks.onPointerMove?.(info, e)
    }

    const onPointerDown: React.PointerEventHandler = (e) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      inputs.onPointerDown(e)
      callbacks.onPointerMove?.(info, e)
    }

    const onPointerUp: React.PointerEventHandler = (e) => {
      e.currentTarget.releasePointerCapture(e.pointerId)
      inputs.onPointerUp(e)
      callbacks.onPointerUp?.(info, e)
    }

    const onPointerEnter: React.PointerEventHandler = (e) => {
      callbacks.onPointerEnter?.(info, e)
    }

    const onPointerLeave: React.PointerEventHandler = (e) => {
      callbacks.onPointerLeave?.(info, e)
    }

    const onKeyDown: React.KeyboardEventHandler = (e) => {
      inputs.onKeyDown(e)
      callbacks.onKeyDown?.(info, e)
    }

    const onKeyUp: React.KeyboardEventHandler = (e) => {
      inputs.onKeyUp(e)
      callbacks.onKeyUp?.(info, e)
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
    <Container bounds={bounds}>
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
