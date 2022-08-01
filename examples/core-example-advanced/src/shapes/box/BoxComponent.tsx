import { SVGContainer, TLShapeUtil } from '@tldraw/core'
import * as React from 'react'
import type { BoxShape } from './BoxShape'

export const BoxComponent = TLShapeUtil.Component<BoxShape, SVGSVGElement>(
  ({ shape, events, isGhost, meta }, ref) => {
    const color = meta.isDarkMode ? 'white' : 'black'

    return (
      <SVGContainer ref={ref} {...events}>
        <rect
          width={shape.size[0]}
          height={shape.size[1]}
          stroke={color}
          strokeWidth={3}
          strokeLinejoin="round"
          fill="none"
          rx={4}
          opacity={isGhost ? 0.3 : 1}
          pointerEvents="all"
        />
      </SVGContainer>
    )
  }
)
