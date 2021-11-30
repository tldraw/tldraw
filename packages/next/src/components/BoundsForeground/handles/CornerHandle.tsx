import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { useBoundsEvents } from '~hooks/useBoundsEvents'
import { TLNuBoundsCorner } from '~types'

const cornerBgClassnames = {
  [TLNuBoundsCorner.TopLeft]: 'nu-cursor-nwse',
  [TLNuBoundsCorner.TopRight]: 'nu-cursor-nesw',
  [TLNuBoundsCorner.BottomRight]: 'nu-cursor-nwse',
  [TLNuBoundsCorner.BottomLeft]: 'nu-cursor-nesw',
}

interface CornerHandleProps {
  cx: number
  cy: number
  size: number
  targetSize: number
  corner: TLNuBoundsCorner
  isHidden?: boolean
}

export const CornerHandle = observer(function CornerHandle({
  cx,
  cy,
  size,
  targetSize,
  corner,
  isHidden,
}: CornerHandleProps): JSX.Element {
  const events = useBoundsEvents(corner)

  return (
    <g opacity={isHidden ? 0 : 1}>
      <circle
        className={'nu-transparent ' + (isHidden ? '' : cornerBgClassnames[corner])}
        aria-label={`${corner} target`}
        cx={cx}
        cy={cy}
        r={targetSize / 2}
        pointerEvents={isHidden ? 'none' : 'all'}
        {...events}
      />
      <rect
        className="nu-corner-handle"
        aria-label={`${corner} handle`}
        x={cx - size / 2}
        y={cy - size / 2}
        width={size}
        height={size}
        pointerEvents="none"
      />
    </g>
  )
})
