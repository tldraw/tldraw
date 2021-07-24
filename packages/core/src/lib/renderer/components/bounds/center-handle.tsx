import { Bounds } from '../../../types'

export default function CenterHandle({
  bounds,
  isLocked,
}: {
  bounds: Bounds
  isLocked: boolean
}): JSX.Element {
  return (
    <rect
      className={isLocked ? 'tl-bounds-center tl-dashed' : 'tl-bounds-center'}
      x={-1}
      y={-1}
      width={bounds.width + 2}
      height={bounds.height + 2}
      pointerEvents="none"
    />
  )
}
