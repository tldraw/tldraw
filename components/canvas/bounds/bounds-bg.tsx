import { useCallback, useRef } from 'react'
import state, { useSelector } from 'state'
import inputs from 'state/inputs'
import styled from 'styles'
import { deepCompareArrays, getPage } from 'utils/utils'

function handlePointerDown(e: React.PointerEvent<SVGRectElement>) {
  if (e.buttons !== 1) return
  if (!inputs.canAccept(e.pointerId)) return
  e.stopPropagation()
  e.currentTarget.setPointerCapture(e.pointerId)
  state.send('POINTED_BOUNDS', inputs.pointerDown(e, 'bounds'))
}

function handlePointerUp(e: React.PointerEvent<SVGRectElement>) {
  if (e.buttons !== 1) return
  if (!inputs.canAccept(e.pointerId)) return
  e.stopPropagation()
  e.currentTarget.releasePointerCapture(e.pointerId)
  state.send('STOPPED_POINTING', inputs.pointerUp(e))
}

export default function BoundsBg() {
  const rBounds = useRef<SVGRectElement>(null)

  const bounds = useSelector((state) => state.values.selectedBounds)

  const isSelecting = useSelector((s) => s.isIn('selecting'))

  const selectedIds = useSelector(
    (s) => Array.from(s.values.selectedIds.values()),
    deepCompareArrays
  )

  const rotation = useSelector((s) => {
    if (selectedIds.length === 1) {
      const { shapes } = getPage(s.data)
      const selected = Array.from(s.values.selectedIds.values())[0]
      return shapes[selected].rotation
    } else {
      return 0
    }
  })

  const isAllHandles = useSelector((s) => {
    const page = getPage(s.data)
    const selectedIds = Array.from(s.values.selectedIds.values())
    return (
      selectedIds.length === 1 &&
      page.shapes[selectedIds[0]]?.handles !== undefined
    )
  })

  if (isAllHandles) return null
  if (!bounds) return null
  if (!isSelecting) return null

  const { width, height } = bounds

  return (
    <StyledBoundsBg
      ref={rBounds}
      width={Math.max(1, width)}
      height={Math.max(1, height)}
      transform={`
        rotate(${rotation * (180 / Math.PI)}, 
        ${(bounds.minX + bounds.maxX) / 2}, 
        ${(bounds.minY + bounds.maxY) / 2})
        translate(${bounds.minX},${bounds.minY})
        rotate(${(bounds.rotation || 0) * (180 / Math.PI)}, 0, 0)`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    />
  )
}

const StyledBoundsBg = styled('rect', {
  fill: '$boundsBg',
})
