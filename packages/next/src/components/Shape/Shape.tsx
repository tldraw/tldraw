import * as React from 'react'
import { Observer, observer } from 'mobx-react-lite'
import { Container } from '~components'
import type { TLNuShape } from '~nu-lib'
import { useShapeEvents } from '~hooks/useShapeEvents'

interface ShapeProps<S extends TLNuShape = TLNuShape, M = any> {
  shape: S
  zIndex: number
  isHovered?: boolean
  isSelected?: boolean
  isBinding?: boolean
  isEditing?: boolean
  meta: M
}

export const Shape = observer(function Shape<S extends TLNuShape = TLNuShape, M = any>({
  shape,
  zIndex,
  isHovered = false,
  isSelected = false,
  isBinding = false,
  isEditing = false,
  meta,
}: ShapeProps<S, M>) {
  const { bounds, rotation, Component } = shape

  const events = useShapeEvents(shape)

  return (
    <Container bounds={bounds} rotation={rotation} zIndex={zIndex}>
      <Component
        meta={meta}
        isEditing={isEditing}
        isBinding={isBinding}
        isHovered={isHovered}
        isSelected={isSelected}
        events={events}
      />
    </Container>
  )
})
