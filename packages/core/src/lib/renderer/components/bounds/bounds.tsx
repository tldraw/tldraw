import { TLBoundsEdge, TLBoundsCorner, TLBounds } from '../../../types'
import { Utils } from '../../../utils'
import { CenterHandle } from './center-handle'
import { RotateHandle } from './rotate-handle'
import { CornerHandle } from './corner-handle'
import { EdgeHandle } from './edge-handle'

interface BoundsProps {
  zoom: number
  bounds: TLBounds
  rotation: number
  isLocked: boolean
}

export function Bounds({ zoom, bounds, rotation, isLocked }: BoundsProps): JSX.Element {
  const size = (Utils.isMobile() ? 10 : 8) / zoom // Touch target size
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
          <EdgeHandle size={size} bounds={bounds} edge={TLBoundsEdge.Top} />
          <EdgeHandle size={size} bounds={bounds} edge={TLBoundsEdge.Right} />
          <EdgeHandle size={size} bounds={bounds} edge={TLBoundsEdge.Bottom} />
          <EdgeHandle size={size} bounds={bounds} edge={TLBoundsEdge.Left} />
          <CornerHandle size={size} bounds={bounds} corner={TLBoundsCorner.TopLeft} />
          <CornerHandle size={size} bounds={bounds} corner={TLBoundsCorner.TopRight} />
          <CornerHandle size={size} bounds={bounds} corner={TLBoundsCorner.BottomRight} />
          <CornerHandle size={size} bounds={bounds} corner={TLBoundsCorner.BottomLeft} />
          <RotateHandle size={size} bounds={bounds} />
        </>
      )}
    </g>
  )
}
