import * as React from 'react'
import type { TLShape } from '+types'
import { usePosition, useTLContext } from '+hooks'

export const ShapeIndicator = React.memo(
  ({ shape, variant }: { shape: TLShape; variant: 'selected' | 'hovered' }) => {
    const { shapeUtils } = useTLContext()
    const utils = shapeUtils[shape.type]
    const bounds = utils.getBounds(shape)
    const rBounds = usePosition(bounds, shape.rotation)

    return (
      <div
        ref={rBounds}
        className={
          'tl-indicator tl-absolute ' + (variant === 'selected' ? 'tl-selected' : 'tl-hovered')
        }
      >
        <svg width="100%" height="100%">
          <g className="tl-centered-g">
            <utils.Indicator shape={shape} />
          </g>
        </svg>
      </div>
    )
  }
)
