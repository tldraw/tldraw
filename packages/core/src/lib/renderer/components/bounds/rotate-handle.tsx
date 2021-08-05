import * as React from 'react'
import { useBoundsHandleEvents } from '../../hooks'
import { TLBounds } from '../../../types'

export const RotateHandle = React.memo(
  ({ bounds, size }: { bounds: TLBounds; size: number }): JSX.Element => {
    const events = useBoundsHandleEvents('rotate')

    return (
      <g cursor="grab">
        <circle
          cx={bounds.width / 2}
          cy={size * -2}
          r={size * 2}
          fill="transparent"
          stroke="none"
          pointerEvents="all"
          {...events}
        />
        <circle
          className="tl-rotate-handle"
          cx={bounds.width / 2}
          cy={size * -2}
          r={size / 2}
          pointerEvents="none"
        />
      </g>
    )
  }
)
