import useHandleEvents from 'hooks/useHandleEvents'
import { getShapeUtils } from 'lib/shape-utils'
import { useRef } from 'react'
import { useSelector } from 'state'
import styled from 'styles'
import { deepCompareArrays, getPage } from 'utils/utils'
import * as vec from 'utils/vec'

export default function Handles() {
  const selectedIds = useSelector(
    (s) => Array.from(s.values.selectedIds.values()),
    deepCompareArrays
  )

  const shape = useSelector(
    ({ data }) =>
      selectedIds.length === 1 && getPage(data).shapes[selectedIds[0]]
  )

  const isSelecting = useSelector((s) =>
    s.isInAny('notPointing', 'pinching', 'translatingHandles')
  )

  if (!shape.handles || !isSelecting) return null

  return (
    <g>
      {Object.values(shape.handles).map((handle) => (
        <Handle
          key={handle.id}
          shapeId={shape.id}
          id={handle.id}
          point={vec.add(handle.point, shape.point)}
        />
      ))}
    </g>
  )
}

function Handle({
  shapeId,
  id,
  point,
}: {
  shapeId: string
  id: string
  point: number[]
}) {
  const rGroup = useRef<SVGGElement>(null)
  const events = useHandleEvents(id, rGroup)

  return (
    <StyledGroup
      key={id}
      className="handles"
      ref={rGroup}
      {...events}
      pointerEvents="all"
      transform={`translate(${point})`}
    >
      <HandleCircleOuter r={12} />
      <use href="#handle" pointerEvents="none" />
    </StyledGroup>
  )
}

const StyledGroup = styled('g', {
  '&:hover': {
    cursor: 'pointer',
  },
  '&:active': {
    cursor: 'none',
  },
})

const HandleCircleOuter = styled('circle', {
  fill: 'transparent',
  stroke: 'none',
  opacity: 0.2,
  pointerEvents: 'all',
  cursor: 'pointer',
  transform: 'scale(var(--scale))',
  '&:hover': {
    fill: '$selected',
    '& > *': {
      stroke: '$selected',
    },
  },
  '&:active': {
    fill: '$selected',
  },
})
