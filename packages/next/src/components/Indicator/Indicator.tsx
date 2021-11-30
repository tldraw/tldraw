/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuShape } from '~nu-lib'

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
  const { bounds, Indicator } = shape

  return (
    <g
      transform={`translate(${bounds.minX}, ${bounds.minY})`}
      className={isSelected ? 'tl-selected' : 'tl-hovered'}
    >
      <Indicator
        isEditing={isEditing}
        isBinding={isBinding}
        isHovered={isHovered}
        isSelected={isSelected}
        meta={meta}
      />
    </g>
  )
})
