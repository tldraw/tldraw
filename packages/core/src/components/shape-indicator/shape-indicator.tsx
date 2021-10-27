/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import type { TLShape } from '+types'
import { usePosition, useTLContext } from '+hooks'

interface IndicatorProps<T extends TLShape, M = any> {
  shape: T
  meta: M extends any ? M : undefined
  isSelected?: boolean
  isHovered?: boolean
  color?: string
}

export const ShapeIndicator = React.memo(
  <T extends TLShape, M = any>({
    isHovered = false,
    isSelected = false,
    shape,
    color,
    meta,
  }: IndicatorProps<T, M>) => {
    const { shapeUtils } = useTLContext()
    const utils = shapeUtils[shape.type]
    const bounds = utils.getBounds(shape)
    const rPositioned = usePosition(bounds, shape.rotation)

    return (
      <div
        ref={rPositioned}
        className={
          'tl-indicator tl-absolute ' + (color ? '' : isSelected ? 'tl-selected' : 'tl-hovered')
        }
      >
        <svg width="100%" height="100%">
          <g className="tl-centered-g" stroke={color}>
            <utils.Indicator
              shape={shape}
              meta={meta}
              isSelected={isSelected}
              isHovered={isHovered}
            />
          </g>
        </svg>
      </div>
    )
  }
)
