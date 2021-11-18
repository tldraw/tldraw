import * as React from 'react'
import { useBoundsHandleEvents } from '~hooks'
import type { TLBounds } from '~types'

interface LinkHandleProps {
  size: number
  targetSize: number
  isHidden: boolean
  bounds: TLBounds
}

export function LinkHandle({ size, bounds, isHidden }: LinkHandleProps) {
  const leftEvents = useBoundsHandleEvents('left')
  const centerEvents = useBoundsHandleEvents('center')
  const rightEvents = useBoundsHandleEvents('right')

  return (
    <g
      cursor="grab"
      transform={`translate(${bounds.width / 2 - size * 4}, ${bounds.height + size * 2})`}
      aria-label="link handle"
    >
      <g className="tl-transparent" pointerEvents={isHidden ? 'none' : 'all'}>
        <rect x={0} y={0} width={size * 2} height={size * 2} {...leftEvents} />
        <rect x={size * 3} y={0} width={size * 2} height={size * 2} {...centerEvents} />
        <rect x={size * 6} y={0} width={size * 2} height={size * 2} {...rightEvents} />
      </g>
      <g
        className="tl-rotate-handle"
        transform={`translate(${size / 2}, ${size / 2})`}
        aria-label="link rotate handle"
      >
        <path
          d={`M 0,${size / 2} L ${size},${size} ${size},0 Z`}
          pointerEvents="none"
          opacity={isHidden ? 0 : 1}
        />
        <path
          transform={`translate(${size * 3}, 0)`}
          d={`M 0,0 L ${size},0 ${size / 2},${size} Z`}
          pointerEvents="none"
          opacity={isHidden ? 0 : 1}
        />
        <path
          transform={`translate(${size * 6}, 0)`}
          d={`M ${size},${size / 2} L 0,0 0,${size} Z`}
          pointerEvents="none"
          opacity={isHidden ? 0 : 1}
        />
      </g>
    </g>
  )
}
