import * as React from 'react'
import { TLBounds } from '../../../types'
import { Utils } from '../../../utils'
import { useBoundsEvents } from '../../hooks/useBoundsEvents'

interface BoundsBgProps {
  bounds: TLBounds
  rotation: number
}

export function BoundsBg({ bounds, rotation }: BoundsBgProps): JSX.Element {
  const events = useBoundsEvents()

  const { width, height } = bounds

  const center = Utils.getBoundsCenter(bounds)

  return (
    <rect
      className="tl-bounds-bg"
      width={Math.max(1, width)}
      height={Math.max(1, height)}
      transform={`
        rotate(${rotation * (180 / Math.PI)},${center})
        translate(${bounds.minX},${bounds.minY})
        rotate(${(bounds.rotation || 0) * (180 / Math.PI)}, 0, 0)`}
      {...events}
    />
  )
}
