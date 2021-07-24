import { useBoundsEvents } from '../../hooks'
import { Corner, Bounds } from '../../../types'

const cornerBgClassnames = {
  [Corner.TopLeft]: 'tl-transparent tl-cursor-nwse',
  [Corner.TopRight]: 'tl-transparent tl-cursor-nesw',
  [Corner.BottomRight]: 'tl-transparent tl-cursor-nwse',
  [Corner.BottomLeft]: 'tl-transparent tl-cursor-nesw',
}

export default function CornerHandle({
  size,
  corner,
  bounds,
}: {
  size: number
  bounds: Bounds
  corner: Corner
}): JSX.Element {
  const events = useBoundsEvents(corner)

  const isTop = corner === Corner.TopLeft || corner === Corner.TopRight
  const isLeft = corner === Corner.TopLeft || corner === Corner.BottomLeft

  return (
    <g>
      <rect
        className={cornerBgClassnames[corner]}
        x={(isLeft ? -1 : bounds.width + 1) - size}
        y={(isTop ? -1 : bounds.height + 1) - size}
        width={size * 2}
        height={size * 2}
        pointerEvents="all"
        {...events}
      />
      <rect
        className="tl-corner-handle"
        x={(isLeft ? -1 : bounds.width + 1) - size / 2}
        y={(isTop ? -1 : bounds.height + 1) - size / 2}
        width={size}
        height={size}
        pointerEvents="none"
      />
    </g>
  )
}
