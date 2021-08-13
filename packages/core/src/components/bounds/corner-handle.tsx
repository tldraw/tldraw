import * as React from 'react'
import { useBoundsHandleEvents } from '~hooks'
import { TLBoundsCorner, TLBounds } from '~types'

const cornerBgClassnames = {
  [TLBoundsCorner.TopLeft]: 'tl-transparent tl-cursor-nwse',
  [TLBoundsCorner.TopRight]: 'tl-transparent tl-cursor-nesw',
  [TLBoundsCorner.BottomRight]: 'tl-transparent tl-cursor-nwse',
  [TLBoundsCorner.BottomLeft]: 'tl-transparent tl-cursor-nesw',
}

export const CornerHandle = React.memo(
  ({
    size,
    corner,
    bounds,
  }: {
    size: number
    bounds: TLBounds
    corner: TLBoundsCorner
  }): JSX.Element => {
    const events = useBoundsHandleEvents(corner)

    const isTop = corner === TLBoundsCorner.TopLeft || corner === TLBoundsCorner.TopRight
    const isLeft = corner === TLBoundsCorner.TopLeft || corner === TLBoundsCorner.BottomLeft

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
)
