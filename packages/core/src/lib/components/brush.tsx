import { useTlSelector, useTLState } from '../hooks'
import styled from '../styles'

export default function Brush(): JSX.Element | null {
  const brush = useTlSelector(({ data }) => data.brush)

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
