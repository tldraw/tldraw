import {observer} from 'mobx-react-lite'
import * as React from 'react'
import type { TLBounds } from '~types'

export interface CenterHandleProps {
  bounds: TLBounds
  isLocked: boolean
  isHidden: boolean
}

export const CenterHandle = observer<CenterHandleProps>(function CenterHandle({
  bounds,
  isLocked,
  isHidden,
}): JSX.Element {
  return (
    <rect
      className={isLocked ? 'tl-bounds-center tl-dashed' : 'tl-bounds-center'}
      x={-1}
      y={-1}
      width={bounds.width + 2}
      height={bounds.height + 2}
      opacity={isHidden ? 0 : 1}
      pointerEvents="none"
      aria-label="center handle"
    />
  )
})
