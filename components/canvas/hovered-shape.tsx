import { memo } from 'react'
import { getShape } from 'utils'
import { getShapeUtils } from 'state/shape-utils'
import vec from 'utils/vec'
import styled from 'styles'
import { useSelector } from 'state'
import { getShapeStyle } from 'state/shape-styles'

function HoveredShape({ id }: { id: string }) {
  const transform = useSelector((s) => {
    const shape = getShape(s.data, id)
    const center = getShapeUtils(shape).getCenter(shape)
    const rotation = shape.rotation * (180 / Math.PI)
    const parentPoint = getShape(s.data, shape.parentId)?.point || [0, 0]

    return `
      translate(${vec.neg(parentPoint)})
      rotate(${rotation}, ${center})
      translate(${shape.point})
  `
  })

  const strokeWidth = useSelector((s) => {
    const shape = getShape(s.data, id)
    const style = getShapeStyle(shape.style)
    return +style.strokeWidth
  })

  return (
    <g transform={transform}>
      <StyledHoverShape href={'#' + id} strokeWidth={strokeWidth + 8} />
      <text>hello</text>
    </g>
  )
}

const StyledHoverShape = styled('use', {
  stroke: '$selected',
  filter: 'url(#expand)',
  opacity: 0.1,
})

export default memo(HoveredShape)
