import * as React from 'react'
import { TLBounds } from '../../../types'

export interface CenterHandleProps {
  bounds: TLBounds
  isLocked: boolean
}

export const CenterHandle = React.memo(
  ({ bounds, isLocked }: CenterHandleProps): JSX.Element => {
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
)
