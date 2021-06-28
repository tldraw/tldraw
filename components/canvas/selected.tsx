import styled from 'styles'
import { useSelector } from 'state'
import { deepCompareArrays, getPage } from 'utils'
import { getShapeUtils } from 'state/shape-utils'
import { memo } from 'react'

export default function Selected(): JSX.Element {
  const currentSelectedShapeIds = useSelector(
    (s) => s.values.selectedIds,
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
  // const rIndicator = useRef<SVGUseElement>(null)

  const shape = useSelector((s) => getPage(s.data).shapes[id])

  // const events = useShapeEvents(id, shape?.type === ShapeType.Group, rIndicator)

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
      // ref={rIndicator}
      as="use"
      href={'#' + id}
      transform={transform}
      isLocked={shape.isLocked}
      // {...events}
    />
  )
})

const SelectIndicator = styled('path', {
  // zStrokeWidth: 2,
  strokeLineCap: 'round',
  strokeLinejoin: 'round',
  stroke: 'red',
  strokeWidth: '10',
  pointerEvents: 'none',
  fill: 'red',

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
