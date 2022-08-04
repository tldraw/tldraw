import * as React from 'react'
import { TLShapeUtil } from '@tldraw/core'
import type { RectShape } from './RectShape'

export const RectIndicator = TLShapeUtil.Indicator<RectShape>(({ shape }) => {
  return (
    <rect
      pointerEvents="none"
      width={shape.size[0]}
      height={shape.size[1]}
      fill="none"
      stroke="tl-selectedStroke"
      strokeWidth={1}
    />
  )
})
