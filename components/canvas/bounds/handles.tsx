import useHandleEvents from 'hooks/useHandleEvents'
import { getShapeUtils } from 'lib/shape-utils'
import { useRef } from 'react'
import { useSelector } from 'state'
import styled from 'styles'
import { deepCompareArrays, getPage } from 'utils/utils'
import * as vec from 'utils/vec'
import { DotCircle } from '../misc'

export default function Handles() {
  const selectedIds = useSelector(
    (s) => Array.from(s.values.selectedIds.values()),
    deepCompareArrays
  )

  const shape = useSelector(
    ({ data }) =>
      selectedIds.length === 1 && getPage(data).shapes[selectedIds[0]]
  )

  const isSelecting = useSelector((s) => s.isIn('selecting.notPointing'))

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
    <g
      key={id}
      ref={rGroup}
      {...events}
      cursor="pointer"
      pointerEvents="all"
      transform={`translate(${point})`}
    >
      <HandleCircleOuter r={12} />
      <DotCircle r={4} />
    </g>
  )
}

const HandleCircleOuter = styled('circle', {
  fill: 'transparent',
  pointerEvents: 'all',
  cursor: 'pointer',
})

const HandleCircle = styled('circle', {
  zStrokeWidth: 2,
  stroke: '$text',
  fill: '$panel',
  pointerEvents: 'none',
})
