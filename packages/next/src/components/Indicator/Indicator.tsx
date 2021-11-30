/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuShape } from '~nu-lib'
import { GeomUtils } from '~utils'
import { Container, SVGContainer } from '~components'

interface IndicatorProps<S extends TLNuShape = TLNuShape, M = any> {
  shape: S
  isHovered?: boolean
  isSelected?: boolean
  isBinding?: boolean
  isEditing?: boolean
  meta?: M
}

export const Indicator = observer(function Shape<S extends TLNuShape = TLNuShape, M = any>({
  shape,
  isHovered = false,
  isSelected = false,
  isBinding = false,
  isEditing = false,
  meta,
}: IndicatorProps<S, M>) {
  const { bounds, rotation = 0, Indicator } = shape

  return (
    <Container bounds={bounds} rotation={rotation}>
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
