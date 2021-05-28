import styled from 'styles'
import { useSelector } from 'state'
import {
  deepCompareArrays,
  getBoundsCenter,
  getPage,
  getSelectedShapes,
} from 'utils/utils'
import * as vec from 'utils/vec'
import { getShapeUtils } from 'lib/shape-utils'
import { Bounds } from 'types'
import useShapeEvents from 'hooks/useShapeEvents'
import { useRef } from 'react'

export default function Selected({ bounds }: { bounds: Bounds }) {
  const currentPageShapeIds = useSelector(({ data }) => {
    return Array.from(data.selectedIds.values())
  }, deepCompareArrays)

  return (
    <g>
      {currentPageShapeIds.map((id) => (
        <ShapeOutline key={id} id={id} bounds={bounds} />
      ))}
    </g>
  )
}

export function ShapeOutline({ id, bounds }: { id: string; bounds: Bounds }) {
  const rIndicator = useRef<SVGUseElement>(null)

  const shape = useSelector(({ data }) => getPage(data).shapes[id])

  const shapeBounds = getShapeUtils(shape).getBounds(shape)

  const events = useShapeEvents(id, rIndicator)

  return (
    <Indicator
      ref={rIndicator}
      as="use"
      href={'#' + id}
      transform={`rotate(${shape.rotation * (180 / Math.PI)},${getBoundsCenter(
        shapeBounds
      )}) translate(${vec.sub(shape.point, [bounds.minX, bounds.minY])})`}
      {...events}
    />
  )
}

const Indicator = styled('path', {
  zStrokeWidth: 1,
  strokeLineCap: 'round',
  strokeLinejoin: 'round',
  stroke: '$selected',
  fill: 'transparent',
  pointerEvents: 'all',
})
