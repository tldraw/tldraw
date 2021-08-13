import * as React from 'react'
import { BrushUpdater } from './BrushUpdater'

export const brushUpdater = new BrushUpdater()

export const Brush = React.memo((): JSX.Element | null => {
  return <rect ref={brushUpdater.ref} className="tl-brush" x={0} y={0} width={0} height={0} />
})
