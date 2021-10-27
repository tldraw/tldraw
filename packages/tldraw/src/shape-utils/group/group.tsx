import * as React from 'react'
import { Utils, SVGContainer, TLIndicator } from '@tldraw/core'
import { defaultStyle } from '../shape-styles'
import { TLDrawShapeType, GroupShape, ColorStyle, TLDrawComponentProps } from '~types'
import { getBoundsRectangle } from '../shared'
import { BINDING_DISTANCE } from '~constants'
import { TLDrawShapeUtil } from '../TLDrawShapeUtil'
import css from '~styles'

type T = GroupShape
type E = SVGSVGElement

export class GroupUtil extends TLDrawShapeUtil<T, E> {
  type = TLDrawShapeType.Group as const

  canBind = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
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
      props
    )
  }

  Component = React.forwardRef<E, TLDrawComponentProps<T, E>>(
    ({ shape, isBinding, isHovered, isSelected, events }, ref) => {
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

      const paths = strokes.map(([start, end], i) => {
        return <line key={id + '_' + i} x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]} />
      })

      return (
        <SVGContainer ref={ref} {...events}>
          {isBinding && (
            <rect
              className="tl-binding-indicator"
              x={-BINDING_DISTANCE}
              y={-BINDING_DISTANCE}
              width={size[0] + BINDING_DISTANCE * 2}
              height={size[1] + BINDING_DISTANCE * 2}
            />
          )}
          <rect
            x={0}
            y={0}
            width={size[0]}
            height={size[1]}
            fill="transparent"
            pointerEvents="all"
          />
          <g
            className={scaledLines()}
            stroke={ColorStyle.Black}
            opacity={isHovered || isSelected ? 1 : 0}
            strokeLinecap="round"
            pointerEvents="stroke"
          >
            {paths}
          </g>
        </SVGContainer>
      )
    }
  )

  Indicator: TLIndicator<T> = ({ shape }) => {
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

    const paths = strokes.map(([start, end], i) => {
      return <line key={id + '_' + i} x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]} />
    })

    return (
      <g className={scaledLines()} strokeLinecap="round" pointerEvents="stroke">
        {paths}
      </g>
    )
  }

  getBounds = (shape: T) => {
    return getBoundsRectangle(shape, this.boundsCache)
  }

  shouldRender = (prev: T, next: T) => {
    return next.size !== prev.size || next.style !== prev.style
  }
}

const scaledLines = css({
  strokeWidth: 'calc(1.5px * var(--tl-scale))',
  strokeDasharray: `calc(1px * var(--tl-scale)), calc(3px * var(--tl-scale))`,
})
