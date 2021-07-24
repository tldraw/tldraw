import { Bounds } from '../../../types'
import useBoundsEvents from '../../hooks/useBoundsEvents'

export default function Rotate({
  bounds,
  size,
}: {
  bounds: Bounds
  size: number
}): JSX.Element {
  const events = useBoundsEvents('rotate')

  return (
    <g cursor="grab" {...events}>
      <circle
        cx={bounds.width / 2}
        cy={size * -2}
        r={size * 2}
        fill="transparent"
        stroke="none"
        pointerEvents="all"
      />
      <circle
        className="tl-rotate-handle"
        cx={bounds.width / 2}
        cy={size * -2}
        r={size / 2}
        pointerEvents="none"
      />
    </g>
  )
}
