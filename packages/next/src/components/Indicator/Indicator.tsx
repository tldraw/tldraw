import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuShape } from '~lib'

interface IndicatorProps<S extends TLNuShape = TLNuShape> {
  shape: S
}

export const Indicator = observer(function Shape({ shape }: IndicatorProps) {
  const { bounds, Indicator } = shape

  return (
    <g transform={`translate(${bounds.minX}, ${bounds.minY})`}>
      <Indicator
        isEditing={false}
        isBinding={false}
        isHovered={false}
        isSelected={false}
        meta={null}
      />
    </g>
  )
})
