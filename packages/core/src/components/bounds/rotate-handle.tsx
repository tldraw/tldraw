import * as React from 'react'
import { useBoundsHandleEvents } from '+hooks'
import type { TLBounds } from '+types'

interface RotateHandleProps {
  bounds: TLBounds
  size: number
  targetSize: number
}

export const RotateHandle = React.memo(
  ({ bounds, targetSize, size }: RotateHandleProps): JSX.Element => {
    const events = useBoundsHandleEvents('rotate')

    return (
      <g cursor="grab">
        <circle
          className="tl-transparent"
          cx={bounds.width / 2}
          cy={size * -2}
          r={targetSize * 2}
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
