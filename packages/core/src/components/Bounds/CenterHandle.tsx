import * as React from 'react'
import type { TLBounds } from '~types'

export interface CenterHandleProps {
  bounds: TLBounds
  isLocked: boolean
  isHidden: boolean
}

function _CenterHandle({ bounds, isLocked, isHidden }: CenterHandleProps) {
  return (
    <rect
      className={['tl-bounds-center', isLocked ? 'tl-dashed' : ''].join(' ')}
      x={-1}
      y={-1}
      width={bounds.width + 2}
      height={bounds.height + 2}
      opacity={isHidden ? 0 : 1}
      pointerEvents="none"
      aria-label="center handle"
    />
  )
}

export const CenterHandle = React.memo(_CenterHandle)
