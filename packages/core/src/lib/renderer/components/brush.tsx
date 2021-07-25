import { TLBounds } from '../../types'

interface BrushProps {
  brush: TLBounds
}

export function Brush({ brush }: BrushProps): JSX.Element | null {
  if (!brush) return null

  return (
    <rect
      className="tl-brush"
      x={brush.minX}
      y={brush.minY}
      width={brush.width}
      height={brush.height}
    />
  )
}
