import * as React from 'react'
import { useTLContext } from '~hooks'
import type { TLBounds } from '~types'

const ROTATIONS = {
  right: 0,
  bottomRight: 45,
  bottom: 90,
  bottomLeft: 135,
  left: 180,
  topLeft: 225,
  top: 270,
  topRight: 315,
}

export interface CloneButtonProps {
  bounds: TLBounds
  targetSize: number
  size: number
  side: 'top' | 'right' | 'bottom' | 'left' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
}

export function CloneButton({ bounds, side, targetSize, size }: CloneButtonProps) {
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
    (e: React.PointerEvent<SVGGElement>) => {
      e.stopPropagation()
      const info = inputs.pointerDown(e, side)
      callbacks.onShapeClone?.(info, e)
    },
    [callbacks.onShapeClone]
  )

  return (
    <g className="tl-clone-target" transform={`translate(${x}, ${y})`} aria-label="clone button">
      <rect
        className="tl-transparent"
        width={targetSize * 4}
        height={targetSize * 4}
        x={-targetSize * 2}
        y={-targetSize * 2}
      />
      <g
        className="tl-clone-button-target"
        onPointerDown={handleClick}
        transform={`rotate(${ROTATIONS[side]})`}
      >
        <circle className="tl-transparent " r={targetSize} />
        <path
          className="tl-clone-button"
          d={`M -${size / 2},-${size / 2} L ${size / 2},0 -${size / 2},${size / 2} Z`}
          strokeLinejoin="round"
        />
      </g>
    </g>
  )
}
