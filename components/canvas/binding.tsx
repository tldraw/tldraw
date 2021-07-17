import { styled } from '@stitches/react'
import { useSelector } from 'state'

export default function Binding(): JSX.Element {
  const binding = useSelector((s) => s.values.currentBinding)

  if (!binding) return null

  const {
    expandedBounds,
    point: [x, y],
  } = binding

  return (
    <g pointerEvents="none">
      <StyledBinding
        x={expandedBounds.minX}
        y={expandedBounds.minY}
        width={expandedBounds.width}
        height={expandedBounds.height}
      />
      <use href="#cross" x={x} y={y} fill="blue" stroke="blue" />
    </g>
  )
}

const StyledBinding = styled('rect', {
  fill: '$brushFill',
})
