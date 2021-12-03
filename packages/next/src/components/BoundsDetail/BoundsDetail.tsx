import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuBoundsDetailComponent } from '~types'
import { HTMLContainer } from '~components'
import { TAU } from '~constants'

export const BoundsDetail: TLNuBoundsDetailComponent = observer(function BoundsDetail({
  bounds,
  scaledBounds,
}) {
  const { rotation = 0 } = bounds
  const isFlipped = Math.abs(rotation) > TAU

  return (
    <HTMLContainer centered>
      <div
        className="nu-bounds-detail"
        style={{
          transform: isFlipped
            ? `rotate(${Math.PI + rotation}rad) translateY(${scaledBounds.height / 2 + 32}px)`
            : ` rotate(${rotation}rad) translateY(${scaledBounds.height / 2 + 24}px)`,
          padding: '2px 3px',
          borderRadius: '1px',
        }}
      >
        {bounds.width.toFixed()} × {bounds.height.toFixed()}
      </div>
    </HTMLContainer>
  )
})
