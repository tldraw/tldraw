import styled from 'styles'
import { useSelector } from 'state'
import {
  deepCompareArrays,
  getBoundsCenter,
  getPage,
  getSelectedIds,
  setToArray,
} from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'
import useShapeEvents from 'hooks/useShapeEvents'
import { memo, useRef } from 'react'
import { ShapeType } from 'types'
import * as vec from 'utils/vec'

export default function Selected() {
  const currentSelectedShapeIds = useSelector(
    ({ data }) => setToArray(getSelectedIds(data)),
    deepCompareArrays
  )

  const isSelecting = useSelector((s) => s.isIn('selecting'))

  if (!isSelecting) return null

  return (
    <g>
      {currentSelectedShapeIds.map((id) => (
        <ShapeOutline key={id} id={id} />
      ))}
    </g>
  )
}

export const ShapeOutline = memo(function ShapeOutline({ id }: { id: string }) {
  const rIndicator = useRef<SVGUseElement>(null)

  const shape = useSelector((s) => getPage(s.data).shapes[id])

  const events = useShapeEvents(id, shape?.type === ShapeType.Group, rIndicator)

  if (!shape) return null

  // This needs computation from state, similar to bounds, in order
  // to handle parent rotation.

  const center = getShapeUtils(shape).getCenter(shape)

  const transform = `
  rotate(${shape.rotation * (180 / Math.PI)}, ${center})
  translate(${shape.point})
  `

  return (
    <SelectIndicator
      ref={rIndicator}
      as="use"
      href={'#' + id}
      transform={transform}
      isLocked={shape.isLocked}
      {...events}
    />
  )
})

const SelectIndicator = styled('path', {
  zStrokeWidth: 1,
  strokeLineCap: 'round',
  strokeLinejoin: 'round',
  stroke: '$selected',
  fill: 'transparent',
  pointerEvents: 'none',
  paintOrder: 'stroke fill markers',

  variants: {
    isLocked: {
      true: {
        zDash: 2,
      },
      false: {},
    },
    variant: {},
  },
})
