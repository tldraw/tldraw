import * as React from 'react'
import { TLBounds } from '../../../types'
import { BrushUpdater } from './BrushUpdater'

export const brushUpdater = new BrushUpdater()

interface BrushProps {
  brush?: TLBounds
}

export const Brush = React.memo(
  ({ brush }: BrushProps): JSX.Element | null => {
    return (
      <rect
        ref={brushUpdater.ref}
        className="tl-brush"
        x={brush?.minX || 0}
        y={brush?.minY || 0}
        width={brush?.width || 0}
        height={brush?.height || 0}
      />
    )
  },
  // Once the brush is controlled, never update again from props
  (prev, next) => prev === next || brushUpdater.isControlled
)
