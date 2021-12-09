/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuShape } from '~nu-lib'
import { Container, SVGContainer } from '~components'

interface IndicatorProps {
  shape: TLNuShape
  isHovered?: boolean
  isSelected?: boolean
  isBinding?: boolean
  isEditing?: boolean
  meta?: any
}

export const Indicator = observer(function Shape({
  shape,
  isHovered = false,
  isSelected = false,
  isBinding = false,
  isEditing = false,
  meta,
}: IndicatorProps) {
  const { bounds, rotation = 0, Indicator } = shape

  return (
    <Container bounds={bounds} rotation={rotation} zIndex={10000}>
      <SVGContainer>
        <g className={`nu-indicator-container ${isSelected ? 'nu-selected' : 'nu-hovered'}`}>
          <Indicator
            isEditing={isEditing}
            isBinding={isBinding}
            isHovered={isHovered}
            isSelected={isSelected}
            meta={meta}
          />
        </g>
      </SVGContainer>
    </Container>
  )
})
