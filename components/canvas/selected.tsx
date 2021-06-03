import styled from 'styles'
import { useSelector } from 'state'
import { deepCompareArrays, getPage } from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'
import useShapeEvents from 'hooks/useShapeEvents'
import { memo, useRef } from 'react'

export default function Selected() {
  const selectedIds = useSelector((s) => s.data.selectedIds)

  const currentPageShapeIds = useSelector(({ data }) => {
    return Array.from(data.selectedIds.values())
  }, deepCompareArrays)

  const isSelecting = useSelector((s) => s.isIn('selecting'))

  if (!isSelecting) return null

  return (
    <g>
      {currentPageShapeIds.map((id) => (
        <ShapeOutline key={id} id={id} isSelected={selectedIds.has(id)} />
      ))}
    </g>
  )
}

export const ShapeOutline = memo(function ShapeOutline({
  id,
  isSelected,
}: {
  id: string
  isSelected: boolean
}) {
  const rIndicator = useRef<SVGUseElement>(null)

  const shape = useSelector(({ data }) => getPage(data).shapes[id])

  const events = useShapeEvents(id, rIndicator)

  if (!shape) return null

  const transform = `
    rotate(${shape.rotation * (180 / Math.PI)},
    ${getShapeUtils(shape).getCenter(shape)})
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
  zStrokeWidth: 3,
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
