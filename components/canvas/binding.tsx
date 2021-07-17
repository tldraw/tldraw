import { useSelector } from 'state'

export default function Binding(): JSX.Element {
  const binding = useSelector((s) => s.values.currentBinding)

  if (!binding) return null

  const {
    point: [x, y],
  } = binding

  return (
    <g pointerEvents="none">
      <use href="#cross" x={x} y={y} fill="blue" stroke="blue" />
    </g>
  )
}
