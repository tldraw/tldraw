import { TLShapeUtil } from '@tldraw/core'
import * as React from 'react'
import type { BoxShape } from './BoxShape'

export const BoxIndicator = TLShapeUtil.Indicator<BoxShape>(({ shape }) => {
  return (
    <rect
      pointerEvents="none"
      width={shape.size[0]}
      height={shape.size[1]}
      fill="none"
      stroke="tl-selectedStroke"
      strokeWidth={1}
      rx={4}
    />
  )
})
