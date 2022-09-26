import * as React from 'react'
import { useBoundsHandleEvents } from '~hooks'
import type { TLBounds } from '~types'

export interface RotateHandleProps {
  bounds: TLBounds
  size: number
  targetSize: number
  isHidden: boolean
}

function _RotateHandle({ bounds, targetSize, size, isHidden }: RotateHandleProps) {
  const events = useBoundsHandleEvents('rotate')

  return (
    <g cursor="grab" opacity={isHidden ? 0 : 1}>
      <circle
        className="tl-transparent"
        aria-label="rotate handle transparent"
        cx={bounds.width / 2}
        cy={size * -2}
        r={targetSize}
        pointerEvents={isHidden ? 'none' : 'all'}
        {...events}
      />
      <circle
        className="tl-rotate-handle"
        aria-label="rotate handle"
        cx={bounds.width / 2}
        cy={size * -2}
        r={size / 2}
        pointerEvents="none"
      />
    </g>
  )
}

export const RotateHandle = React.memo(_RotateHandle)
