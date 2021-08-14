import * as React from 'react'
import type { TLShape } from '+types'
import { useTLContext } from '+hooks'

export const ShapeIndicator = React.memo(
  ({ shape, variant }: { shape: TLShape; variant: 'selected' | 'hovered' }) => {
    const { shapeUtils } = useTLContext()
    const utils = shapeUtils[shape.type]

    const center = utils.getCenter(shape)
    const rotation = (shape.rotation || 0) * (180 / Math.PI)
    const transform = `rotate(${rotation}, ${center}) translate(${shape.point})`

    return (
      <g className={variant === 'selected' ? 'tl-selected' : 'tl-hovered'} transform={transform}>
        {shapeUtils[shape.type].renderIndicator(shape)}
      </g>
    )
  }
)
