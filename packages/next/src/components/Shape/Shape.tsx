import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { Container } from '~components'
import type { TLNuShape } from '~nu-lib'
import { useShapeEvents } from '~hooks/useShapeEvents'

interface ShapeProps {
  shape: TLNuShape
  zIndex: number
  isHovered?: boolean
  isSelected?: boolean
  isBinding?: boolean
  isEditing?: boolean
  meta: any
}

export const Shape = observer(function Shape({
  shape,
  zIndex,
  isHovered = false,
  isSelected = false,
  isBinding = false,
  isEditing = false,
  meta,
}: ShapeProps) {
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
