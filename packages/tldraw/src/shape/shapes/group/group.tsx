import * as React from 'react'
import { SVGContainer, Utils, ShapeUtil } from '@tldraw/core'
import { defaultStyle, getPerfectDashProps } from '~shape/shape-styles'
import {
  GroupShape,
  TLDrawShapeType,
  TLDrawToolType,
  ColorStyle,
  DashStyle,
  TLDrawMeta,
} from '~types'
import { getBoundsRectangle } from '../shared'

export const Group = new ShapeUtil<GroupShape, SVGSVGElement, TLDrawMeta>(() => ({
  type: TLDrawShapeType.Group,

  toolType: TLDrawToolType.Bounds,

  canBind: true,

  defaultProps: {
    id: 'id',
    type: TLDrawShapeType.Group,
    name: 'Group',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    size: [100, 100],
    rotation: 0,
    children: [],
    style: defaultStyle,
  },

  Component({ shape, isBinding, isHovered, isSelected, events }, ref) {
    const { id, size } = shape

    const sw = 2
    const w = Math.max(0, size[0] - sw / 2)
    const h = Math.max(0, size[1] - sw / 2)

    const strokes: [number[], number[], number][] = [
      [[sw / 2, sw / 2], [w, sw / 2], w - sw / 2],
      [[w, sw / 2], [w, h], h - sw / 2],
      [[w, h], [sw / 2, h], w - sw / 2],
      [[sw / 2, h], [sw / 2, sw / 2], h - sw / 2],
    ]

    const paths = strokes.map(([start, end, length], i) => {
      const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
        length,
        sw,
        DashStyle.Dotted
      )

      return (
        <line
          key={id + '_' + i}
          x1={start[0]}
          y1={start[1]}
          x2={end[0]}
          y2={end[1]}
          stroke={ColorStyle.Black}
          strokeWidth={isHovered || isSelected ? sw : 0}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
      )
    })

    return (
      <SVGContainer ref={ref} {...events}>
        {isBinding && (
          <rect
            className="tl-binding-indicator"
            x={-32}
            y={-32}
            width={size[0] + 64}
            height={size[1] + 64}
          />
        )}
        <rect x={0} y={0} width={size[0]} height={size[1]} fill="transparent" pointerEvents="all" />
        <g pointerEvents="stroke">{paths}</g>
      </SVGContainer>
    )
  },

  Indicator({ shape }) {
    const { id, size } = shape

    const sw = 2
    const w = Math.max(0, size[0] - sw / 2)
    const h = Math.max(0, size[1] - sw / 2)

    const strokes: [number[], number[], number][] = [
      [[sw / 2, sw / 2], [w, sw / 2], w - sw / 2],
      [[w, sw / 2], [w, h], h - sw / 2],
      [[w, h], [sw / 2, h], w - sw / 2],
      [[sw / 2, h], [sw / 2, sw / 2], h - sw / 2],
    ]

    const paths = strokes.map(([start, end, length], i) => {
      const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
        length,
        sw,
        DashStyle.Dotted
      )

      return (
        <line
          key={id + '_' + i}
          x1={start[0]}
          y1={start[1]}
          x2={end[0]}
          y2={end[1]}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
      )
    })

    return <g>{paths}</g>
  },

  shouldRender(prev, next) {
    return next.size !== prev.size || next.style !== prev.style
  },

  getBounds(shape) {
    return getBoundsRectangle(shape, this.boundsCache)
  },
}))
