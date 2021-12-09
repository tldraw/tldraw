import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { useBoundsEvents } from '~hooks/useBoundsEvents'
import type { TLNuBoundsComponentProps } from '~types'
import { SVGContainer } from '~components'
import type { TLNuShape } from '~nu-lib'

export const BoundsBackground = observer(function BoundsBackground<S extends TLNuShape>({
  bounds,
}: TLNuBoundsComponentProps<S>) {
  const events = useBoundsEvents('background')

  return (
    <SVGContainer>
      <rect
        className="nu-bounds-bg"
        width={Math.max(1, bounds.width)}
        height={Math.max(1, bounds.height)}
        pointerEvents="all"
        {...events}
      />
    </SVGContainer>
  )
})
