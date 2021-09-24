import * as React from 'react'
import { Utils, SVGContainer, ShapeUtil } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import getStroke, { getStrokePoints } from 'perfect-freehand'
import { getPerfectDashProps, defaultStyle, getShapeStyle } from '~shape/shape-styles'
import { RectangleShape, DashStyle, TLDrawShapeType, TLDrawToolType, TLDrawMeta } from '~types'
import { getBoundsRectangle, transformRectangle, transformSingleRectangle } from '../shared'
import { EASINGS } from '~state/utils'

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

    if (style.dash === DashStyle.Draw) {
      const pathData = Utils.getFromCache(pathCache, shape.size, () => getRectanglePath(shape))

      return (
        <SVGContainer ref={ref} id={shape.id + '_svg'} {...events}>
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

    const sw = 1 + strokeWidth * 2

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
      <SVGContainer ref={ref} id={shape.id + '_svg'} {...events}>
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
          stroke="none"
          strokeWidth={sw}
          pointerEvents="all"
        />
        <g pointerEvents="stroke">{paths}</g>
      </SVGContainer>
    )
  },

  Indicator({ shape }) {
    return <path d={getRectangleIndicatorPathData(shape)} />
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

function getRectangleDrawPoints(shape: RectangleShape) {
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

  const px = Math.max(8, Math.floor(w / 20))
  const py = Math.max(8, Math.floor(h / 20))
  const rm = Math.floor(5 + getRandom() * 4)

  const lines = Utils.shuffleArr(
    [
      Vec.pointsBetween(tr, br, py, EASINGS.linear),
      Vec.pointsBetween(br, bl, px, EASINGS.linear),
      Vec.pointsBetween(bl, tl, py, EASINGS.linear),
      Vec.pointsBetween(tl, tr, px, EASINGS.linear),
    ],
    rm
  )

  return {
    points: [...lines.flat(), ...lines[0], ...lines[1]].slice(
      4,
      Math.floor((rm % 2 === 0 ? px : py) / -2) + 2
    ),
    edgeDistance: rm % 2 === 0 ? px : py,
  }
}

function getRectanglePath(shape: RectangleShape) {
  const { points, edgeDistance } = getRectangleDrawPoints(shape)
  const styles = getShapeStyle(shape.style)

  const stroke = getStroke(points, {
    size: 1 + styles.strokeWidth * 2,
    thinning: 0.5,
    end: { taper: edgeDistance },
    start: { taper: edgeDistance },
    simulatePressure: false,
    last: true,
  })

  return Utils.getSvgPathFromStroke(stroke)
}

function getRectangleIndicatorPathData(shape: RectangleShape) {
  const { points } = getRectangleDrawPoints(shape)

  return Utils.getSvgPathFromStroke(
    getStrokePoints(points).map((pt) => pt.point.slice(0, 2)),
    false
  )
}
