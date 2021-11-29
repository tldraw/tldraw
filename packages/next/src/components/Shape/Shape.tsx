import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { Container } from '~components/Container'
import type { TLNuShape } from '~types'

interface ShapeProps<S extends TLNuShape = TLNuShape> {
  shape: S
}

export const Shape = observer(function Shape({ shape }: ShapeProps) {
  const { bounds, Component } = shape

  return (
    <Container bounds={bounds}>
      <Component
        shape={shape}
        isEditing={false}
        isBinding={false}
        isHovered={false}
        isSelected={false}
        meta={null}
      />
    </Container>
  )
})
