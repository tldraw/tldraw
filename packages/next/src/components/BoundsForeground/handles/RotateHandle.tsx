import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { useBoundsEvents } from '~hooks/useBoundsEvents'

interface RotateHandleProps {
  cx: number
  cy: number
  size: number
  targetSize: number
  isHidden?: boolean
}

export const RotateHandle = observer<RotateHandleProps>(function RotateHandle({
  cx,
  cy,
  size,
  targetSize,
  isHidden,
}): JSX.Element {
  const events = useBoundsEvents('rotate')

  return (
    <g cursor="grab" opacity={isHidden ? 0 : 1}>
      <circle
        className="nu-transparent"
        aria-label="rotate target"
        cx={cx}
        cy={cy}
        r={targetSize}
        pointerEvents={isHidden ? 'none' : 'all'}
        {...events}
      />
      <circle
        className="nu-rotate-handle"
        aria-label="rotate handle"
        cx={cx}
        cy={cy}
        r={size / 2}
        pointerEvents="none"
      />
    </g>
  )
})
