import * as React from 'react'
import { TLBoundsEdge, TLBoundsCorner, TLBounds } from '+types'
import { Utils } from '+utils'
import { CenterHandle } from './center-handle'
import { RotateHandle } from './rotate-handle'
import { CornerHandle } from './corner-handle'
import { EdgeHandle } from './edge-handle'

interface BoundsProps {
  zoom: number
  bounds: TLBounds
  rotation: number
  isLocked: boolean
  viewportWidth: number
}

export function Bounds({
  zoom,
  bounds,
  viewportWidth,
  rotation,
  isLocked,
}: BoundsProps): JSX.Element {
  const targetSize = (viewportWidth < 768 ? 16 : 8) / zoom // Touch target size
  const size = 8 / zoom // Touch target size
  const center = Utils.getBoundsCenter(bounds)

  return (
    <g
      pointerEvents="all"
      transform={`
        rotate(${rotation * (180 / Math.PI)},${center})
        translate(${bounds.minX},${bounds.minY})
        rotate(${(bounds.rotation || 0) * (180 / Math.PI)}, 0, 0)`}
    >
      <CenterHandle bounds={bounds} isLocked={isLocked} />
      {!isLocked && (
        <>
          <EdgeHandle targetSize={targetSize} size={size} bounds={bounds} edge={TLBoundsEdge.Top} />
          <EdgeHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            edge={TLBoundsEdge.Right}
          />
          <EdgeHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            edge={TLBoundsEdge.Bottom}
          />
          <EdgeHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            edge={TLBoundsEdge.Left}
          />
          <CornerHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            corner={TLBoundsCorner.TopLeft}
          />
          <CornerHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            corner={TLBoundsCorner.TopRight}
          />
          <CornerHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            corner={TLBoundsCorner.BottomRight}
          />
          <CornerHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            corner={TLBoundsCorner.BottomLeft}
          />
          <RotateHandle targetSize={targetSize} size={size} bounds={bounds} />
        </>
      )}
    </g>
  )
}
