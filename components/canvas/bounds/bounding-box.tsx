import * as React from 'react'
import { Edge, Corner } from 'types'
import { useSelector } from 'state'
import {
  deepCompareArrays,
  getBoundsCenter,
  getCurrentCamera,
  getPage,
  getSelectedShapes,
  isMobile,
} from 'utils/utils'

import CenterHandle from './center-handle'
import CornerHandle from './corner-handle'
import EdgeHandle from './edge-handle'
import RotateHandle from './rotate-handle'
import Handles from './handles'

export default function Bounds() {
  const isBrushing = useSelector((s) => s.isIn('brushSelecting'))
  const isSelecting = useSelector((s) => s.isIn('selecting'))
  const zoom = useSelector((s) => getCurrentCamera(s.data).zoom)
  const bounds = useSelector((s) => s.values.selectedBounds)

  const selectedIds = useSelector(
    (s) => Array.from(s.values.selectedIds.values()),
    deepCompareArrays
  )

  const rotation = useSelector(({ data }) =>
    data.selectedIds.size === 1 ? getSelectedShapes(data)[0].rotation : 0
  )

  const isAllLocked = useSelector((s) => {
    const page = getPage(s.data)
    return selectedIds.every((id) => page.shapes[id]?.isLocked)
  })

  const isSingleHandles = useSelector((s) => {
    const page = getPage(s.data)
    return (
      selectedIds.length === 1 &&
      page.shapes[selectedIds[0]]?.handles !== undefined
    )
  })

  if (!bounds) return null

  if (!isSelecting) return null

  if (isSingleHandles) return null

  const size = (isMobile().any ? 10 : 8) / zoom // Touch target size

  return (
    <g
      pointerEvents={isBrushing ? 'none' : 'all'}
      transform={`
        rotate(${rotation * (180 / Math.PI)}, 
        ${(bounds.minX + bounds.maxX) / 2}, 
        ${(bounds.minY + bounds.maxY) / 2})
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
