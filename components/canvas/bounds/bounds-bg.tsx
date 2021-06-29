import { useRef } from 'react'
import state, { useSelector } from 'state'
import inputs from 'state/inputs'
import styled from 'styles'
import tld from 'utils/tld'

function handlePointerDown(e: React.PointerEvent<SVGRectElement>) {
  if (!inputs.canAccept(e.pointerId)) return
  e.stopPropagation()
  e.currentTarget.setPointerCapture(e.pointerId)
  const info = inputs.pointerDown(e, 'bounds')

  if (e.button === 0) {
    state.send('POINTED_BOUNDS', info)
  } else if (e.button === 2) {
    state.send('RIGHT_POINTED', info)
  }
}

function handlePointerUp(e: React.PointerEvent<SVGRectElement>) {
  if (!inputs.canAccept(e.pointerId)) return
  e.stopPropagation()
  e.currentTarget.releasePointerCapture(e.pointerId)
  state.send('STOPPED_POINTING', inputs.pointerUp(e, 'bounds'))
}

export default function BoundsBg(): JSX.Element {
  const rBounds = useRef<SVGRectElement>(null)

  const bounds = useSelector((state) => state.values.selectedBounds)

  const isSelecting = useSelector((s) => s.isIn('selecting'))

  const rotation = useSelector((s) => {
    const selectedIds = s.values.selectedIds

    if (selectedIds.length === 1) {
      const selected = selectedIds[0]
      const page = tld.getPage(s.data)

      return page.shapes[selected]?.rotation
    } else {
      return 0
    }
  })

  const isAllHandles = useSelector((s) => {
    const selectedIds = s.values.selectedIds

    if (selectedIds.length === 1) {
      const page = tld.getPage(s.data)
      const selected = selectedIds[0]

      return (
        selectedIds.length === 1 && page.shapes[selected]?.handles !== undefined
      )
    }
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
      pointerEvents="all"
    />
  )
}

const StyledBoundsBg = styled('rect', {
  fill: '$boundsBg',
})
