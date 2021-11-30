import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { useBoundsEvents } from '~hooks/useBoundsEvents'
import type { TLNuBoundsComponentProps } from '~types'
import type { TLNuShape } from '~nu-lib'

export const BoundsBackground = observer(function BoundsBackground<S extends TLNuShape>({
  bounds,
}: TLNuBoundsComponentProps<S>) {
  const events = useBoundsEvents('center')

  return (
    <rect
      className="nu-bounds-bg"
      x={bounds.minX}
      y={bounds.minY}
      width={bounds.width}
      height={bounds.height}
      pointerEvents="all"
      {...events}
    />
  )
})
