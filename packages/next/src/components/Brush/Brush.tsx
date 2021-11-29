import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuBounds } from '~types'

interface BrushProps {
  brush: TLNuBounds
}

export const Brush = observer(function Brush({ brush }: BrushProps) {
  return (
    <rect
      className="nu-brush"
      x={brush.minX}
      y={brush.minY}
      width={brush.width}
      height={brush.height}
    />
  )
})
