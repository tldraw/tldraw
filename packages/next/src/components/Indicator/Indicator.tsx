import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { Container } from '~components/Container'
import type { TLNuShape } from '~lib'

interface IndicatorProps<S extends TLNuShape = TLNuShape> {
  shape: S
}

export const Indicator = observer(function Shape({ shape }: IndicatorProps) {
  const { bounds, Indicator } = shape

  return (
    <Container bounds={bounds}>
      <Indicator
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
