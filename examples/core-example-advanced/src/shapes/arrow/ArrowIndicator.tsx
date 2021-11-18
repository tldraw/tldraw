import * as React from 'react'
import { TLShapeUtil } from '@tldraw/core'
import type { ArrowShape } from './ArrowShape'
import Vec from '@tldraw/vec'

export const ArrowIndicator = TLShapeUtil.Indicator<ArrowShape>(({ shape }) => {
  const { start, end } = shape.handles

  const u = Vec.uni(Vec.sub(end.point, start.point))
  const dist = Vec.dist(end.point, start.point)
  const length = Math.min(18, dist / 2)
  const ahLeft = Vec.rotWith(Vec.sub(end.point, Vec.mul(u, length)), end.point, -Math.PI / 6)
  const ahRight = Vec.rotWith(Vec.sub(end.point, Vec.mul(u, length)), end.point, Math.PI / 6)

  return (
    <path
      d={`M ${start.point} L ${end.point} M ${ahLeft} L ${end.point} ${ahRight}`}
      stroke="tl-selectedStroke"
      strokeWidth={2}
      strokeLinejoin="round"
      strokeLinecap="round"
      fill="none"
    />
  )
})
