import * as React from 'react'
import { useBoundsHandleEvents } from '+hooks'
import { TLBoundsCorner, TLBounds } from '+types'

const cornerBgClassnames = {
  [TLBoundsCorner.TopLeft]: 'tl-transparent tl-cursor-nwse',
  [TLBoundsCorner.TopRight]: 'tl-transparent tl-cursor-nesw',
  [TLBoundsCorner.BottomRight]: 'tl-transparent tl-cursor-nwse',
  [TLBoundsCorner.BottomLeft]: 'tl-transparent tl-cursor-nesw',
}

interface CornerHandleProps {
  size: number
  targetSize: number
  bounds: TLBounds
  corner: TLBoundsCorner
}

export const CornerHandle = React.memo(
  ({ size, targetSize, corner, bounds }: CornerHandleProps): JSX.Element => {
    const events = useBoundsHandleEvents(corner)

    const isTop = corner === TLBoundsCorner.TopLeft || corner === TLBoundsCorner.TopRight
    const isLeft = corner === TLBoundsCorner.TopLeft || corner === TLBoundsCorner.BottomLeft

    return (
      <g>
        <rect
          className={cornerBgClassnames[corner]}
          x={(isLeft ? -1 : bounds.width + 1) - targetSize}
          y={(isTop ? -1 : bounds.height + 1) - targetSize}
          width={targetSize * 2}
          height={targetSize * 2}
          pointerEvents="all"
          fill="red"
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
