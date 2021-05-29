import * as React from 'react'
import { Edge, Corner } from 'types'
import { useSelector } from 'state'
import { getPage, getSelectedShapes, isMobile } from 'utils/utils'

import CenterHandle from './center-handle'
import CornerHandle from './corner-handle'
import EdgeHandle from './edge-handle'
import RotateHandle from './rotate-handle'

export default function Bounds() {
  const isBrushing = useSelector((s) => s.isIn('brushSelecting'))
  const isSelecting = useSelector((s) => s.isIn('selecting'))
  const zoom = useSelector((s) => s.data.camera.zoom)
  const bounds = useSelector((s) => s.values.selectedBounds)

  const rotation = useSelector(({ data }) =>
    data.selectedIds.size === 1 ? getSelectedShapes(data)[0].rotation : 0
  )

  const isAllLocked = useSelector((s) => {
    const page = getPage(s.data)
    return Array.from(s.data.selectedIds.values()).every(
      (id) => page.shapes[id].isLocked
    )
  })

  if (!bounds) return null
  if (!isSelecting) return null

  const size = (isMobile().any ? 12 : 8) / zoom // Touch target size

  return (
    <g
      pointerEvents={isBrushing ? 'none' : 'all'}
      transform={`
        rotate(${rotation * (180 / Math.PI)}, 
        ${(bounds.minX + bounds.maxX) / 2}, 
        ${(bounds.minY + bounds.maxY) / 2})
        translate(${bounds.minX},${bounds.minY})`}
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
