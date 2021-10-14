import * as React from 'react'
import { useTLContext } from '+hooks'
import type { TLBounds } from '+types'

export interface CloneButtonProps {
  bounds: TLBounds
  side: 'top' | 'right' | 'bottom' | 'left'
}

export function CloneButton({ bounds, side }: CloneButtonProps) {
  const x = side === 'left' ? -44 : side === 'right' ? bounds.width + 44 : bounds.width / 2
  const y = side === 'top' ? -44 : side === 'bottom' ? bounds.height + 44 : bounds.height / 2

  const { callbacks, inputs } = useTLContext()

  const handleClick = React.useCallback(
    (e: React.PointerEvent<SVGCircleElement>) => {
      e.stopPropagation()
      const info = inputs.pointerDown(e, side)
      callbacks.onShapeClone?.(info, e)
    },
    [callbacks.onShapeClone]
  )

  return (
    <g className="tl-clone-button-target" transform={`translate(${x}, ${y})`}>
      <rect className="tl-transparent" width={88} height={88} x={-44} y={-44} />
      <circle className="tl-clone-button" onPointerDown={handleClick} />
    </g>
  )
}
