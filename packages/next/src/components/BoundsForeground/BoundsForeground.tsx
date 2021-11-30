import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { TLNuBoundsComponentProps, TLNuBoundsCorner, TLNuBoundsEdge } from '~types'
import { EdgeHandle, CornerHandle, RotateHandle } from './handles'
import type { TLNuShape } from '~nu-lib'
import { SVGContainer } from '../SVGContainer'

export const BoundsForeground = observer(function BoundsFg<S extends TLNuShape>({
  bounds,
}: TLNuBoundsComponentProps<S>) {
  const { width, height } = bounds

  const size = 8
  const targetSize = 6

  return (
    <SVGContainer>
      <rect
        className="nu-bounds-fg"
        x={0}
        y={0}
        width={Math.max(width, 1)}
        height={Math.max(height, 1)}
        pointerEvents="none"
      />
      <EdgeHandle
        x={0 + targetSize * 2}
        y={0}
        width={width - targetSize * 4}
        height={0}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Top}
      />
      <EdgeHandle
        x={width}
        y={0 + targetSize * 2}
        width={0}
        height={height - targetSize * 4}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Right}
      />
      <EdgeHandle
        x={0 + targetSize * 2}
        y={height}
        width={width - targetSize * 4}
        height={0}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Bottom}
      />
      <EdgeHandle
        x={0}
        y={0 + targetSize * 2}
        width={0}
        height={height - targetSize * 4}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Left}
      />
      <CornerHandle
        cx={0}
        cy={0}
        size={8}
        targetSize={targetSize}
        corner={TLNuBoundsCorner.TopLeft}
      />
      <CornerHandle
        cx={width}
        cy={0}
        size={8}
        targetSize={targetSize}
        corner={TLNuBoundsCorner.TopRight}
      />
      <CornerHandle
        cx={width}
        cy={height}
        size={8}
        targetSize={targetSize}
        corner={TLNuBoundsCorner.BottomRight}
      />
      <CornerHandle
        cx={0}
        cy={height}
        size={8}
        targetSize={targetSize}
        corner={TLNuBoundsCorner.BottomLeft}
      />
      <RotateHandle
        cx={0 + width / 2}
        cy={0 - targetSize * 2}
        size={size}
        targetSize={targetSize}
      />
    </SVGContainer>
  )
})
