import { SVGContainer, TLShapeUtil } from '@tldraw/core'
import * as React from 'react'
import type { RectShape } from './RectShape'

export const RectComponent = TLShapeUtil.Component<RectShape, SVGSVGElement>(
  ({ shape, events, meta }, ref) => {
    const color = meta.isDarkMode ? 'white' : 'black'

    return (
      <SVGContainer ref={ref} {...events}>
        <rect
          width={shape.size[0]}
          height={shape.size[1]}
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          fill="none"
          pointerEvents="all"
        />
      </SVGContainer>
    )
  }
)
