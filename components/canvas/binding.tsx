import { useSelector } from 'state'
import styled from 'styles'

export default function Binding(): JSX.Element {
  const binding = useSelector((s) => s.values.currentBinding)

  if (!binding) return null

  const {
    point: [x, y],
    type,
  } = binding

  return (
    <g pointerEvents="none">
      {type === 'center' && <StyledCenter cx={x} cy={y} r={8} stroke="blue" />}
      {type !== 'pin' && (
        <StyledCross href="#cross" x={x} y={y} fill="blue" stroke="blue" />
      )}
    </g>
  )
}

const StyledCross = styled('use', {
  fill: 'none',
  stroke: '$selected',
  zStrokeWidth: 2,
})

const StyledCenter = styled('circle', {
  fill: 'none',
  stroke: '$selected',
  zStrokeWidth: 2,
})
