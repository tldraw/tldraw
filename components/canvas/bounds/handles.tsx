import useHandleEvents from 'hooks/useHandleEvents'
import { getShapeUtils } from 'state/shape-utils'
import { useRef } from 'react'
import { useSelector } from 'state'
import styled from 'styles'
import tld from 'utils/tld'
import vec from 'utils/vec'

export default function Handles(): JSX.Element {
  const shape = useSelector(
    (s) =>
      s.values.selectedIds.length === 1 &&
      tld.getPage(s.data).shapes[s.values.selectedIds[0]]
  )

  const isSelecting = useSelector((s) =>
    s.isInAny('notPointing', 'pinching', 'translatingHandles')
  )

  if (!shape || !shape.handles || !isSelecting) return null

  const center = getShapeUtils(shape).getCenter(shape)

  return (
    <g transform={`rotate(${shape.rotation * (180 / Math.PI)},${center})`}>
      {Object.values(shape.handles).map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          point={vec.add(handle.point, shape.point)}
        />
      ))}
    </g>
  )
}

function Handle({ id, point }: { id: string; point: number[] }) {
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
