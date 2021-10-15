import * as React from 'react'
import { useTLContext } from '+hooks'
import type { TLBounds } from '+types'

export interface CloneButtonProps {
  bounds: TLBounds
  side: 'top' | 'right' | 'bottom' | 'left' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
}

export function CloneButton({ bounds, side }: CloneButtonProps) {
  const x = {
    left: -44,
    topLeft: -44,
    bottomLeft: -44,
    right: bounds.width + 44,
    topRight: bounds.width + 44,
    bottomRight: bounds.width + 44,
    top: bounds.width / 2,
    bottom: bounds.width / 2,
  }[side]

  const y = {
    left: bounds.height / 2,
    right: bounds.height / 2,
    top: -44,
    topLeft: -44,
    topRight: -44,
    bottom: bounds.height + 44,
    bottomLeft: bounds.height + 44,
    bottomRight: bounds.height + 44,
  }[side]

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
