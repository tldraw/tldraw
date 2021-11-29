import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuBounds } from '~types'

interface BoundsFgProps {
  bounds: TLNuBounds
}

export const BoundsFg = observer(function BoundsFg({ bounds }: BoundsFgProps) {
  return (
    <rect
      className="nu-bounds-fg"
      x={bounds.minX}
      y={bounds.minY}
      width={bounds.width}
      height={bounds.height}
    />
  )
})
