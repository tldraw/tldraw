import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuBounds } from '~types'

interface BoundsBgProps {
  bounds: TLNuBounds
}

export const BoundsBg = observer(function BoundsBg({ bounds }: BoundsBgProps) {
  return (
    <rect
      className="nu-bounds-bg"
      x={bounds.minX}
      y={bounds.minY}
      width={bounds.width}
      height={bounds.height}
    />
  )
})
