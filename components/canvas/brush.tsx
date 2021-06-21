import { useSelector } from 'state'
import styled from 'styles'

export default function Brush(): JSX.Element {
  const brush = useSelector(({ data }) => data.brush)

  if (!brush) return null

  return (
    <BrushRect
      x={brush.minX}
      y={brush.minY}
      width={brush.width}
      height={brush.height}
    />
  )
}

const BrushRect = styled('rect', {
  fill: '$brushFill',
  stroke: '$brushStroke',
  zStrokeWidth: 1,
})
