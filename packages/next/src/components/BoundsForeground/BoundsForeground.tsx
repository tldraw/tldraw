import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { TLNuBoundsComponentProps, TLNuBoundsCorner, TLNuBoundsEdge } from '~types'
import { EdgeHandle, CornerHandle, RotateHandle } from './handles'
import type { TLNuShape } from '~nu-lib'

export const BoundsForeground = observer(function BoundsFg<S extends TLNuShape>({
  bounds,
}: TLNuBoundsComponentProps<S>) {
  const { minX, minY, maxX, maxY, width, height } = bounds

  const size = 8
  const targetSize = 12

  return (
    <g>
      <rect
        className="nu-bounds-fg"
        x={minX}
        y={minY}
        width={width}
        height={height}
        pointerEvents="none"
      />
      <CornerHandle
        cx={minX}
        cy={minY}
        size={8}
        targetSize={targetSize}
        corner={TLNuBoundsCorner.TopLeft}
      />
      <CornerHandle
        cx={maxX}
        cy={minY}
        size={8}
        targetSize={targetSize}
        corner={TLNuBoundsCorner.TopRight}
      />
      <CornerHandle
        cx={maxX}
        cy={maxY}
        size={8}
        targetSize={targetSize}
        corner={TLNuBoundsCorner.BottomRight}
      />
      <CornerHandle
        cx={minX}
        cy={maxY}
        size={8}
        targetSize={targetSize}
        corner={TLNuBoundsCorner.BottomLeft}
      />
      <EdgeHandle
        x={minX}
        y={minY}
        width={width}
        height={0}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Top}
      />
      <EdgeHandle
        x={maxX}
        y={minY}
        width={0}
        height={height}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Right}
      />
      <EdgeHandle
        x={minX}
        y={maxY}
        width={width}
        height={0}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Bottom}
      />
      <EdgeHandle
        x={minX}
        y={minY}
        width={0}
        height={height}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Left}
      />
      <RotateHandle
        cx={minX + width / 2 - targetSize / 2}
        cy={minY - targetSize * 1.5}
        size={size}
        targetSize={targetSize}
      />
    </g>
  )
})
