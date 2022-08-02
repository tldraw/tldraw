import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { useBoundsHandleEvents } from '~hooks'
import { TLBounds, TLBoundsCorner } from '~types'

const cornerBgClassnames = {
  [TLBoundsCorner.TopLeft]: 'tl-cursor-nwse',
  [TLBoundsCorner.TopRight]: 'tl-cursor-nesw',
  [TLBoundsCorner.BottomRight]: 'tl-cursor-nwse',
  [TLBoundsCorner.BottomLeft]: 'tl-cursor-nesw',
}

interface CornerHandleProps {
  size: number
  targetSize: number
  bounds: TLBounds
  corner: TLBoundsCorner
  isHidden?: boolean
}

export const CornerHandle = observer(function CornerHandle({
  size,
  targetSize,
  isHidden,
  corner,
  bounds,
}: CornerHandleProps) {
  const events = useBoundsHandleEvents(corner)

  const isTop = corner === TLBoundsCorner.TopLeft || corner === TLBoundsCorner.TopRight
  const isLeft = corner === TLBoundsCorner.TopLeft || corner === TLBoundsCorner.BottomLeft

  return (
    <g opacity={isHidden ? 0 : 1}>
      <rect
        className={'tl-transparent ' + (isHidden ? '' : cornerBgClassnames[corner])}
        aria-label="corner transparent"
        x={(isLeft ? -1 : bounds.width + 1) - targetSize}
        y={(isTop ? -1 : bounds.height + 1) - targetSize}
        width={targetSize * 2}
        height={targetSize * 2}
        pointerEvents={isHidden ? 'none' : 'all'}
        {...events}
      />
      <rect
        className="tl-corner-handle"
        aria-label="corner handle"
        x={(isLeft ? -1 : bounds.width + 1) - size / 2}
        y={(isTop ? -1 : bounds.height + 1) - size / 2}
        width={size}
        height={size}
        pointerEvents="none"
      />
    </g>
  )
})
