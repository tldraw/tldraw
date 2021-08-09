import * as React from 'react'
import { Vec } from '../../../utils'
import type { TLShape } from '../../../types'
import { useTLContext } from '../../hooks'
import { Handle } from './handle'

interface HandlesProps {
  shape: TLShape
  zoom: number
}

const toAngle = 180 / Math.PI

export const Handles = React.memo(
  ({ shape, zoom }: HandlesProps): JSX.Element | null => {
    const { shapeUtils } = useTLContext()

    const center = shapeUtils[shape.type].getCenter(shape)

    if (shape.handles === undefined) {
      return null
    }

    return (
      <g transform={`rotate(${(shape.rotation || 0) * toAngle},${center})`}>
        {Object.values(shape.handles).map((handle) => (
          <Handle
            key={shape.id + '_' + handle.id}
            id={handle.id}
            point={Vec.add(handle.point, shape.point)}
            zoom={zoom}
          />
        ))}
      </g>
    )
  }
)
