import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { TLNuBoundsComponentProps, TLNuBoundsCorner, TLNuBoundsEdge } from '~types'
import { EdgeHandle, CornerHandle, RotateHandle } from './handles'
import type { TLNuShape } from '~nu-lib'
import { SVGContainer } from '../SVGContainer'

export const BoundsForeground = observer(function BoundsFg<S extends TLNuShape>({
  bounds,
  zoom,
  showResizeHandles,
  showRotateHandle,
}: TLNuBoundsComponentProps<S>) {
  const { width, height } = bounds

  const size = 8 / zoom
  const targetSize = 6 / zoom

  return (
    <SVGContainer>
      <rect
        className="nu-bounds-fg"
        width={Math.max(width, 1)}
        height={Math.max(height, 1)}
        pointerEvents="none"
      />
      <EdgeHandle
        x={targetSize * 2}
        y={0}
        width={width - targetSize * 4}
        height={0}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Top}
      />
      <EdgeHandle
        x={width}
        y={targetSize * 2}
        width={0}
        height={height - targetSize * 4}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Right}
      />
      <EdgeHandle
        x={targetSize * 2}
        y={height}
        width={width - targetSize * 4}
        height={0}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Bottom}
      />
      <EdgeHandle
        x={0}
        y={targetSize * 2}
        width={0}
        height={height - targetSize * 4}
        targetSize={targetSize}
        edge={TLNuBoundsEdge.Left}
      />
      {showResizeHandles && (
        <>
          <CornerHandle
            cx={0}
            cy={0}
            size={size}
            targetSize={targetSize}
            corner={TLNuBoundsCorner.TopLeft}
          />
          <CornerHandle
            cx={width}
            cy={0}
            size={size}
            targetSize={targetSize}
            corner={TLNuBoundsCorner.TopRight}
          />
          <CornerHandle
            cx={width}
            cy={height}
            size={size}
            targetSize={targetSize}
            corner={TLNuBoundsCorner.BottomRight}
          />
          <CornerHandle
            cx={0}
            cy={height}
            size={size}
            targetSize={targetSize}
            corner={TLNuBoundsCorner.BottomLeft}
          />
        </>
      )}
      {showRotateHandle && (
        <RotateHandle cx={width / 2} cy={0 - targetSize * 2} size={size} targetSize={targetSize} />
      )}
    </SVGContainer>
  )
})
