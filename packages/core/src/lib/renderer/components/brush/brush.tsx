import * as React from 'react'
import { TLBounds } from '../../../types'
import { BrushUpdater } from './BrushUpdater'

export const brushUpdater = new BrushUpdater()

interface BrushProps {
  brush?: TLBounds
}

export const Brush = React.memo(
  ({ brush }: BrushProps): JSX.Element | null => {
    return <rect ref={brushUpdater.ref} className="tl-brush" x={0} y={0} width={0} height={0} />
  },
  // Once the brush is controlled, never update again from props
  (prev, next) => true
)
