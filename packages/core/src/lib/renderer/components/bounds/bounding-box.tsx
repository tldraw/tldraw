import { Edge, Corner, Bounds } from '../../../types'
import { Utils } from '../../../utils'
import CenterHandle from './center-handle'
import CornerHandle from './corner-handle'
import EdgeHandle from './edge-handle'
import RotateHandle from './rotate-handle'

interface BoundsProps {
  zoom: number
  bounds: Bounds
  rotation: number
  isLocked: boolean
}

export default function Bounds({
  zoom,
  bounds,
  rotation,
  isLocked,
}: BoundsProps): JSX.Element {
  const size = (Utils.isMobile() ? 10 : 8) / zoom // Touch target size
  const center = Utils.getBoundsCenter(bounds)

  return (
    <g
      pointerEvents={'all'}
      transform={`
        rotate(${rotation * (180 / Math.PI)},${center})
        translate(${bounds.minX},${bounds.minY})
        rotate(${(bounds.rotation || 0) * (180 / Math.PI)}, 0, 0)`}
    >
      <CenterHandle bounds={bounds} isLocked={isLocked} />
      {!isLocked && (
        <>
          <EdgeHandle size={size} bounds={bounds} edge={Edge.Top} />
          <EdgeHandle size={size} bounds={bounds} edge={Edge.Right} />
          <EdgeHandle size={size} bounds={bounds} edge={Edge.Bottom} />
          <EdgeHandle size={size} bounds={bounds} edge={Edge.Left} />
          <CornerHandle size={size} bounds={bounds} corner={Corner.TopLeft} />
          <CornerHandle size={size} bounds={bounds} corner={Corner.TopRight} />
          <CornerHandle
            size={size}
            bounds={bounds}
            corner={Corner.BottomRight}
          />
          <CornerHandle
            size={size}
            bounds={bounds}
            corner={Corner.BottomLeft}
          />
          <RotateHandle size={size} bounds={bounds} />
        </>
      )}
    </g>
  )
}
