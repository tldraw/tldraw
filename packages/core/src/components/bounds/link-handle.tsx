import * as React from 'react'
import { useTLContext } from '+hooks'
import type { TLBounds } from '+types'

interface LinkHandleProps {
  size: number
  targetSize: number
  isHidden: boolean
  bounds: TLBounds
}

export function LinkHandle({ size, bounds, targetSize, isHidden }: LinkHandleProps) {
  const { callbacks, inputs } = useTLContext()

  const handleClick = React.useCallback(
    (e: React.PointerEvent<SVGCircleElement>) => {
      e.stopPropagation()
      const info = inputs.pointerDown(e, 'link')
      callbacks.onPointLinkHandle?.(info, e)
    },
    [callbacks.onPointLinkHandle]
  )

  return (
    <g cursor="grab">
      <circle
        className="tl-transparent"
        cx={bounds.width / 2}
        cy={bounds.height + size * 2}
        r={targetSize}
        pointerEvents={isHidden ? 'none' : 'all'}
        onPointerDown={handleClick}
      />
      <path
        className="tl-rotate-handle"
        transform={`translate(${bounds.width / 2 - size / 2}, ${bounds.height + size * 1.7})`}
        d={`M 0,0 L ${size},0 ${size / 2},${size} Z`}
        pointerEvents="none"
        opacity={isHidden ? 0 : 1}
      />
    </g>
  )
}
