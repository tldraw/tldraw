import * as React from 'react'
import { TLBounds, Utils, Vec, TLTransformInfo, Intersect } from '@tldraw/core'
import getStroke, { getStrokePoints } from 'perfect-freehand'
import { defaultStyle, getShapeStyle } from '~shape/shape-styles'
import {
  DrawShape,
  DashStyle,
  TLDrawShapeUtil,
  TLDrawShapeType,
  TLDrawToolType,
  TLDrawRenderInfo,
} from '~types'

export class Draw extends TLDrawShapeUtil<DrawShape> {
  type = TLDrawShapeType.Draw as const
  toolType = TLDrawToolType.Draw

  pointsBoundsCache = new WeakMap<DrawShape['points'], TLBounds>([])
  rotatedCache = new WeakMap<DrawShape, number[][]>([])
  drawPathCache = new WeakMap<DrawShape['points'], string>([])
  simplePathCache = new WeakMap<DrawShape['points'], string>([])
  polygonCache = new WeakMap<DrawShape['points'], string>([])

  defaultProps: DrawShape = {
    id: 'id',
    type: TLDrawShapeType.Draw as const,
    name: 'Draw',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    points: [],
    rotation: 0,
    style: defaultStyle,
  }

  shouldRender(prev: DrawShape, next: DrawShape): boolean {
    return next.points !== prev.points || next.style !== prev.style
  }

  render(shape: DrawShape, { meta, isEditing }: TLDrawRenderInfo): JSX.Element {
    const { points, style } = shape

    const styles = getShapeStyle(style, meta.isDarkMode)

    const strokeWidth = styles.strokeWidth

    // For very short lines, draw a point instead of a line
    const bounds = this.getBounds(shape)

    const verySmall = bounds.width < strokeWidth / 2 && bounds.height < strokeWidth / 2

    if (!isEditing && verySmall) {
      const sw = strokeWidth * 0.618

      return (
        <circle
          r={strokeWidth * 0.618}
          fill={styles.stroke}
          stroke={styles.stroke}
          strokeWidth={sw}
          pointerEvents="all"
        />
      )
    }

    const shouldFill =
      style.isFilled &&
      points.length > 3 &&
      Vec.dist(points[0], points[points.length - 1]) < +styles.strokeWidth * 2

    // For drawn lines, draw a line from the path cache

    if (shape.style.dash === DashStyle.Draw) {
      const polygonPathData = Utils.getFromCache(this.polygonCache, points, () =>
        getFillPath(shape)
      )

      const drawPathData = isEditing
        ? getDrawStrokePath(shape, true)
        : Utils.getFromCache(this.drawPathCache, points, () => getDrawStrokePath(shape, false))

      return (
        <>
          {shouldFill && (
            <path
              d={polygonPathData}
              stroke="none"
              fill={styles.fill}
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="fill"
            />
          )}
          <path
            d={drawPathData}
            fill={styles.stroke}
            stroke={styles.stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            pointerEvents="all"
          />
        </>
      )
    }

    // For solid, dash and dotted lines, draw a regular stroke path

    const strokeDasharray = {
      [DashStyle.Draw]: 'none',
      [DashStyle.Solid]: `none`,
      [DashStyle.Dotted]: `${strokeWidth / 10} ${strokeWidth * 3}`,
      [DashStyle.Dashed]: `${strokeWidth * 3} ${strokeWidth * 3}`,
    }[style.dash]

    const strokeDashoffset = {
      [DashStyle.Draw]: 'none',
      [DashStyle.Solid]: `none`,
      [DashStyle.Dotted]: `-${strokeWidth / 20}`,
      [DashStyle.Dashed]: `-${strokeWidth}`,
    }[style.dash]

    const path = Utils.getFromCache(this.simplePathCache, points, () => getSolidStrokePath(shape))

    const sw = strokeWidth * 1.618

    return (
      <>
        <path
          d={path}
          fill={shouldFill ? styles.fill : 'none'}
          stroke="transparent"
          strokeWidth={Math.min(4, strokeWidth * 2)}
          strokeLinejoin="round"
          strokeLinecap="round"
          pointerEvents={shouldFill ? 'all' : 'stroke'}
        />
        <path
          d={path}
          fill="transparent"
          stroke={styles.stroke}
          strokeWidth={sw}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinejoin="round"
          strokeLinecap="round"
          pointerEvents="stroke"
        />
      </>
    )
  }

  renderIndicator(shape: DrawShape): JSX.Element {
    const { points } = shape

    const bounds = this.getBounds(shape)

    const verySmall = bounds.width < 4 && bounds.height < 4

    if (verySmall) {
      return <circle x={bounds.width / 2} y={bounds.height / 2} r={1} />
    }

    const path = Utils.getFromCache(this.simplePathCache, points, () => getSolidStrokePath(shape))

    return <path d={path} />
  }

  getBounds(shape: DrawShape): TLBounds {
    return Utils.translateBounds(
      Utils.getFromCache(this.pointsBoundsCache, shape.points, () =>
        Utils.getBoundsFromPoints(shape.points)
      ),
      shape.point
    )
  }

  getRotatedBounds(shape: DrawShape): TLBounds {
    return Utils.translateBounds(
      Utils.getBoundsFromPoints(shape.points, shape.rotation),
      shape.point
    )
  }

  getCenter(shape: DrawShape): number[] {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  hitTest(): boolean {
    return true
  }

  hitTestBounds(shape: DrawShape, brushBounds: TLBounds): boolean {
    // Test axis-aligned shape
    if (!shape.rotation) {
      const bounds = this.getBounds(shape)

      return (
        Utils.boundsContain(brushBounds, bounds) ||
        ((Utils.boundsContain(bounds, brushBounds) ||
          Intersect.bounds.bounds(bounds, brushBounds).length > 0) &&
          Intersect.polyline.bounds(
            shape.points,
            Utils.translateBounds(brushBounds, Vec.neg(shape.point))
          ).length > 0)
      )
    }

    // Test rotated shape
    const rBounds = this.getRotatedBounds(shape)

    const rotatedBounds = Utils.getFromCache(this.rotatedCache, shape, () => {
      const c = Utils.getBoundsCenter(Utils.getBoundsFromPoints(shape.points))
      return shape.points.map((pt) => Vec.rotWith(pt, c, shape.rotation || 0))
    })

    return (
      Utils.boundsContain(brushBounds, rBounds) ||
      Intersect.bounds.polyline(
        Utils.translateBounds(brushBounds, Vec.neg(shape.point)),
        rotatedBounds
      ).length > 0
    )
  }

  transform(
    shape: DrawShape,
    bounds: TLBounds,
    { initialShape, scaleX, scaleY }: TLTransformInfo<DrawShape>
  ): Partial<DrawShape> {
    const initialShapeBounds = Utils.getFromCache(this.boundsCache, initialShape, () =>
      Utils.getBoundsFromPoints(initialShape.points)
    )

    const points = initialShape.points.map(([x, y, r]) => {
      return [
        bounds.width *
          (scaleX < 0 // * sin?
            ? 1 - x / initialShapeBounds.width
            : x / initialShapeBounds.width),
        bounds.height *
          (scaleY < 0 // * cos?
            ? 1 - y / initialShapeBounds.height
            : y / initialShapeBounds.height),
        r,
      ]
    })

    const newBounds = Utils.getBoundsFromPoints(shape.points)

    const point = Vec.sub([bounds.minX, bounds.minY], [newBounds.minX, newBounds.minY])

    return {
      points,
      point,
    }
  }

  transformSingle(
    shape: DrawShape,
    bounds: TLBounds,
    info: TLTransformInfo<DrawShape>
  ): Partial<DrawShape> {
    return this.transform(shape, bounds, info)
  }

  onSessionComplete(shape: DrawShape): Partial<DrawShape> {
    const bounds = this.getBounds(shape)

    const [x1, y1] = Vec.sub([bounds.minX, bounds.minY], shape.point)

    return {
      points: shape.points.map(([x0, y0, p]) => [x0 - x1, y0 - y1, p]),
      point: Vec.add(shape.point, [x1, y1]),
    }
  }
}

const simulatePressureSettings = {
  simulatePressure: true,
}

const realPressureSettings = {
  easing: (t: number) => t * t,
  simulatePressure: false,
  start: { taper: 1 },
  end: { taper: 1 },
}

function getFillPath(shape: DrawShape) {
  const styles = getShapeStyle(shape.style)

  if (shape.points.length < 2) {
    return ''
  }

  return Utils.getSvgPathFromStroke(
    getStrokePoints(shape.points, {
      size: 1 + styles.strokeWidth * 2,
      thinning: 0.85,
      end: { taper: +styles.strokeWidth * 10 },
      start: { taper: +styles.strokeWidth * 10 },
    }).map((pt) => pt.point)
  )
}

function getDrawStrokePath(shape: DrawShape, isEditing: boolean) {
  const styles = getShapeStyle(shape.style)

  if (shape.points.length < 2) {
    return ''
  }

  const options = shape.points[1][2] === 0.5 ? simulatePressureSettings : realPressureSettings

  const stroke = getStroke(shape.points.slice(2), {
    size: 1 + styles.strokeWidth * 2,
    thinning: 0.85,
    end: { taper: +styles.strokeWidth * 50 },
    start: { taper: +styles.strokeWidth * 50 },
    ...options,
    last: !isEditing,
  })

  const path = Utils.getSvgPathFromStroke(stroke)

  return path
}

function getSolidStrokePath(shape: DrawShape) {
  let { points } = shape

  let len = points.length

  if (len === 0) return 'M 0 0 L 0 0'
  if (len < 3) return `M ${points[0][0]} ${points[0][1]}`

  points = getStrokePoints(points).map((pt) => pt.point)

  len = points.length

  const d = points.reduce(
    (acc, [x0, y0], i, arr) => {
      if (i === len - 1) {
        acc.push('L', x0, y0)
        return acc
      }

      const [x1, y1] = arr[i + 1]
      acc.push(x0.toFixed(2), y0.toFixed(2), ((x0 + x1) / 2).toFixed(2), ((y0 + y1) / 2).toFixed(2))
      return acc
    },
    ['M', points[0][0], points[0][1], 'Q']
  )

  const path = d.join(' ').replaceAll(/(\s[0-9]*\.[0-9]{2})([0-9]*)\b/g, '$1')

  return path
}
