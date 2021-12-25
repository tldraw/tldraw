import { observer } from 'mobx-react-lite'
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

export const CloneButton = observer<CloneButtonProps>(function CloneButton({
  bounds,
  side,
  targetSize,
  size,
}: CloneButtonProps) {
  const s = targetSize * 2
  const x = {
    left: -s,
    topLeft: -s,
    bottomLeft: -s,
    right: bounds.width,
    topRight: bounds.width,
    bottomRight: bounds.width,
    top: bounds.width / 2 - s / 2,
    bottom: bounds.width / 2 - s / 2,
  }[side]

  const y = {
    left: bounds.height / 2 - s / 2,
    right: bounds.height / 2 - s / 2,
    top: -s * 2,
    topLeft: -s,
    topRight: -s,
    bottom: bounds.height,
    bottomLeft: bounds.height,
    bottomRight: bounds.height,
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
      <rect className="tl-transparent" width={targetSize * 2} height={targetSize * 2} />
      <g
        className="tl-clone-button-target"
        onPointerDown={handleClick}
        transform={`translate(${targetSize}, ${targetSize}) rotate(${ROTATIONS[side]})`}
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
})
