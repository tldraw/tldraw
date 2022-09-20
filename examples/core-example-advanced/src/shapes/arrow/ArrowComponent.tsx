import { SVGContainer, TLShapeUtil } from '@tldraw/core'
import Vec from '@tldraw/vec'
import * as React from 'react'
import type { ArrowShape } from './ArrowShape'

export const ArrowComponent = TLShapeUtil.Component<ArrowShape, SVGSVGElement>(
  ({ shape, events, isGhost, meta }, ref) => {
    const color = meta.isDarkMode ? 'white' : 'black'
    const { start, end } = shape.handles

    const u = Vec.uni(Vec.sub(end.point, start.point))
    const dist = Vec.dist(end.point, start.point)
    const length = Math.min(18, dist / 2)
    const ahLeft = Vec.rotWith(Vec.sub(end.point, Vec.mul(u, length)), end.point, -Math.PI / 6)
    const ahRight = Vec.rotWith(Vec.sub(end.point, Vec.mul(u, length)), end.point, Math.PI / 6)

    return (
      <SVGContainer ref={ref} {...events}>
        <path
          d={`M ${start.point} L ${end.point} M ${ahLeft} L ${end.point} ${ahRight}`}
          strokeWidth={8}
          stroke="none"
          fill="none"
          pointerEvents="all"
        />
        <path
          d={`M ${start.point} L ${end.point} M ${ahLeft} L ${end.point} ${ahRight}`}
          stroke={color}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          pointerEvents="none"
          opacity={isGhost ? 0.3 : 1}
        />
      </SVGContainer>
    )
  }
)
