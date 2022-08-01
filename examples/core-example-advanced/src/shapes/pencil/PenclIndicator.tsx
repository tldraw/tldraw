import { TLShapeUtil } from '@tldraw/core'
import * as React from 'react'
import type { PencilShape } from './PencilShape'
import { getIndicatorSvgPath } from './pencil-helpers'

export const PencilIndicator = TLShapeUtil.Indicator<PencilShape>(({ shape }) => {
  return (
    <path
      d={getIndicatorSvgPath(shape.points)}
      pointerEvents="none"
      fill="none"
      stroke="tl-selectedStroke"
      strokeWidth={1}
      rx={4}
    />
  )
})
