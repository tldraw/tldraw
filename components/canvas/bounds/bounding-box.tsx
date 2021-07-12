import * as React from 'react'
import { Edge, Corner } from 'types'
import { useSelector } from 'state'
import { getBoundsCenter, isMobile } from 'utils'
import tld from 'utils/tld'
import CenterHandle from './center-handle'
import CornerHandle from './corner-handle'
import EdgeHandle from './edge-handle'
import RotateHandle from './rotate-handle'

export default function Bounds(): JSX.Element {
  const isBrushing = useSelector((s) => s.isIn('brushSelecting'))

  const shouldDisplay = useSelector((s) =>
    s.isInAny('selecting', 'selectPinching')
  )

  const zoom = useSelector((s) => tld.getCurrentCamera(s.data).zoom)

  const bounds = useSelector((s) => s.values.selectedBounds)

  const rotation = useSelector((s) => s.values.selectedRotation)

  const isAllLocked = useSelector((s) => {
    const page = tld.getPage(s.data)
    return s.values.selectedIds.every((id) => page.shapes[id]?.isLocked)
  })

  const isSingleHandles = useSelector((s) => {
    const page = tld.getPage(s.data)
    return (
      s.values.selectedIds.length === 1 &&
      page.shapes[s.values.selectedIds[0]]?.handles !== undefined
    )
  })

  if (!bounds) return null

  if (!shouldDisplay) return null

  if (isSingleHandles) return null

  const size = (isMobile() ? 10 : 8) / zoom // Touch target size
  const center = getBoundsCenter(bounds)

  return (
    <g
      pointerEvents={isBrushing ? 'none' : 'all'}
      transform={`
        rotate(${rotation * (180 / Math.PI)},${center})
        translate(${bounds.minX},${bounds.minY})
        rotate(${(bounds.rotation || 0) * (180 / Math.PI)}, 0, 0)`}
    >
      <CenterHandle bounds={bounds} isLocked={isAllLocked} />
      {!isAllLocked && (
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
