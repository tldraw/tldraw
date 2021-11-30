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
  const targetSize = 6

  return (
    <g>
      <rect
        className="nu-bounds-fg"
        x={minX}
        y={minY}
        width={Math.max(width, 1)}
        height={Math.max(height, 1)}
        pointerEvents="none"
      />
      <EdgeHandle
        x={minX + targetSize * 2}
        y={minY}
        width={width - targetSize * 4}
        height={0}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Top}
      />
      <EdgeHandle
        x={maxX}
        y={minY + targetSize * 2}
        width={0}
        height={height - targetSize * 4}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Right}
      />
      <EdgeHandle
        x={minX + targetSize * 2}
        y={maxY}
        width={width - targetSize * 4}
        height={0}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Bottom}
      />
      <EdgeHandle
        x={minX}
        y={minY + targetSize * 2}
        width={0}
        height={height - targetSize * 4}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Left}
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
      <RotateHandle
        cx={minX + width / 2}
        cy={minY - targetSize * 2}
        size={size}
        targetSize={targetSize}
      />
    </g>
  )
})
