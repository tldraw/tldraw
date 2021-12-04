import * as React from 'react'
import { Utils, SVGContainer } from '@tldraw/core'
import { TriangleShape, TDShapeType, TDMeta } from '~types'
import { TDShapeUtil } from '../TDShapeUtil'
import {
  defaultStyle,
  getShapeStyle,
  getBoundsRectangle,
  transformRectangle,
  transformSingleRectangle,
} from '~state/shapes/shared'

type T = TriangleShape
type E = SVGSVGElement

export class TriangleUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Triangle as const

  canBind = true

  canClone = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'id',
        type: TDShapeType.Triangle,
        name: 'Triangle',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        size: [1, 1],
        rotation: 0,
        style: defaultStyle,
      },
      props
    )
  }

  Component = TDShapeUtil.Component<T, E, TDMeta>(
    ({ shape, isBinding, isGhost, meta, events }, ref) => {
      const { id, size, style } = shape

      const styles = getShapeStyle(style, meta.isDarkMode)

      const { strokeWidth } = styles

      const sw = 1 + strokeWidth * 1.618

      const w = Math.max(0, size[0] - sw / 2)
      const h = Math.max(0, size[1] - sw / 2)

      const strokes: [number[], number[], number][] = [
        [[sw / 2, h], [w / 2, sw / 2], h - sw / 2],
        [[sw / 2, h], [w, h], w - sw / 2],
        [[w, h], [w / 2, sw / 2], h - sw / 2],
      ]

      const paths = strokes.map(([start, end, length], i) => {
        const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
          length,
          strokeWidth * 1.618,
          shape.style.dash
        )

        return (
          <line
            key={id + '_' + i}
            x1={start[0]}
            y1={start[1]}
            x2={end[0]}
            y2={end[1]}
            stroke={styles.stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
          />
        )
      })
      
      return (
        <SVGContainer ref={ref} id={shape.id + '_svg'} {...events}>
          {isBinding && (
            <polygon className="tl-binding-indicator" 
              points={getTrianglePoints(sw / 2 - 32, sw / 2 - 32, w + 64, h + 64)}
            />
          )}
          <polygon
            points={getTrianglePoints(sw / 2, sw / 2, w, h)} 
            fill={styles.fill}
            strokeWidth={sw}
            stroke="none"
            pointerEvents="all"
          />
          <g pointerEvents="stroke">{paths}</g>
        </SVGContainer>
      )
    }
  )

  Indicator = TDShapeUtil.Indicator<T>(({ shape }) => {
    const {
      style,
      size: [width, height],
    } = shape

    const styles = getShapeStyle(style, false)
    const sw = styles.strokeWidth

    const w = Math.max(0, width - sw)
    const h = Math.max(0, height - sw)

    return (
      <polygon
        points={getTrianglePoints(sw, sw, w, h)} 
      />
    )
  })

  getBounds = (shape: T) => {
    return getBoundsRectangle(shape, this.boundsCache)
  }

  shouldRender = (prev: T, next: T) => {
    return next.size !== prev.size || next.style !== prev.style
  }

  transform = transformRectangle

  transformSingle = transformSingleRectangle
}

/* -------------------------------------------------- */
/*                       Helpers                      */
/* -------------------------------------------------- */

function getTrianglePoints(x: number, y: number, w: number, h: number) {
  const p1x = w / 2;
  const p1y = y;
  const p2x = x;
  const p2y = h;
  const p3x = w;
  const p3y = h;

  return `${p1x} ${p1y}, ${p2x} ${p2y}, ${p3x} ${p3y}`;
}
