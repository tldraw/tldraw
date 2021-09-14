import * as React from 'react'
import { Utils, SVGContainer, ShapeUtil } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import getStroke from 'perfect-freehand'
import { getPerfectDashProps, defaultStyle, getShapeStyle } from '~shape/shape-styles'
import { RectangleShape, DashStyle, TLDrawShapeType, TLDrawToolType, TLDrawMeta } from '~types'
import { getBoundsRectangle, transformRectangle, transformSingleRectangle } from '../shared'

const pathCache = new WeakMap<number[], string>([])

export const Rectangle = new ShapeUtil<RectangleShape, SVGSVGElement, TLDrawMeta>(() => ({
  type: TLDrawShapeType.Rectangle,

  toolType: TLDrawToolType.Bounds,

  canBind: true,

  defaultProps: {
    id: 'id',
    type: TLDrawShapeType.Rectangle,
    name: 'Rectangle',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    size: [1, 1],
    rotation: 0,
    style: defaultStyle,
  },

  shouldRender(prev, next) {
    return next.size !== prev.size || next.style !== prev.style
  },

  Component({ shape, isBinding, meta, events }, ref) {
    const { id, size, style } = shape
    const styles = getShapeStyle(style, meta.isDarkMode)
    const strokeWidth = +styles.strokeWidth

    this

    if (style.dash === DashStyle.Draw) {
      const pathData = Utils.getFromCache(pathCache, shape.size, () => renderPath(shape))

      return (
        <SVGContainer ref={ref} {...events}>
          {isBinding && (
            <rect
              className="tl-binding-indicator"
              x={strokeWidth / 2 - 32}
              y={strokeWidth / 2 - 32}
              width={Math.max(0, size[0] - strokeWidth / 2) + 64}
              height={Math.max(0, size[1] - strokeWidth / 2) + 64}
            />
          )}
          <rect
            x={+styles.strokeWidth / 2}
            y={+styles.strokeWidth / 2}
            width={Math.max(0, size[0] - strokeWidth)}
            height={Math.max(0, size[1] - strokeWidth)}
            fill={style.isFilled ? styles.fill : 'none'}
            radius={strokeWidth}
            stroke="none"
            pointerEvents="all"
          />
          <path
            d={pathData}
            fill={styles.stroke}
            stroke={styles.stroke}
            strokeWidth={styles.strokeWidth}
            pointerEvents="all"
          />
        </SVGContainer>
      )
    }

    const sw = strokeWidth * 1.618

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
      <SVGContainer ref={ref} {...events}>
        {isBinding && (
          <rect
            className="tl-binding-indicator"
            x={sw / 2 - 32}
            y={sw / 2 - 32}
            width={w + 64}
            height={h + 64}
          />
        )}
        <rect
          x={sw / 2}
          y={sw / 2}
          width={w}
          height={h}
          fill={styles.fill}
          stroke="transparent"
          strokeWidth={sw}
          pointerEvents="all"
        />
        <g pointerEvents="stroke">{paths}</g>
      </SVGContainer>
    )
  },

  Indicator({ shape }) {
    const {
      style,
      size: [width, height],
    } = shape

    const styles = getShapeStyle(style, false)
    const strokeWidth = +styles.strokeWidth

    const sw = strokeWidth

    return (
      <rect
        x={sw / 2}
        y={sw / 2}
        rx={1}
        ry={1}
        width={Math.max(1, width - sw)}
        height={Math.max(1, height - sw)}
      />
    )
  },

  getBounds(shape) {
    return getBoundsRectangle(shape, this.boundsCache)
  },

  transform: transformRectangle,

  transformSingle: transformSingleRectangle,
}))

/* -------------------------------------------------- */
/*                       Helpers                      */
/* -------------------------------------------------- */

function renderPath(shape: RectangleShape) {
  const styles = getShapeStyle(shape.style)

  const getRandom = Utils.rng(shape.id)

  const strokeWidth = +styles.strokeWidth

  const baseOffset = strokeWidth / 2

  const offsets = Array.from(Array(4)).map(() => [
    getRandom() * baseOffset,
    getRandom() * baseOffset,
  ])

  const sw = strokeWidth

  const w = Math.max(0, shape.size[0] - sw / 2)
  const h = Math.max(0, shape.size[1] - sw / 2)

  const tl = Vec.add([sw / 2, sw / 2], offsets[0])
  const tr = Vec.add([w, sw / 2], offsets[1])
  const br = Vec.add([w, h], offsets[2])
  const bl = Vec.add([sw / 2, h], offsets[3])

  const lines = Utils.shuffleArr(
    [
      Vec.pointsBetween(tr, br),
      Vec.pointsBetween(br, bl),
      Vec.pointsBetween(bl, tl),
      Vec.pointsBetween(tl, tr),
    ],
    Math.floor(5 + getRandom() * 4)
  )

  const stroke = getStroke([...lines.flat().slice(4), ...lines[0], ...lines[0].slice(4)], {
    size: 1 + styles.strokeWidth,
    thinning: 0.618,
    easing: (t) => t * t * t * t,
    end: { cap: true },
    start: { cap: true },
    simulatePressure: false,
    last: true,
  })

  return Utils.getSvgPathFromStroke(stroke)
}
