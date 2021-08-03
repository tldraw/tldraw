import {
  TLShape,
  Utils,
  TLTransformInfo,
  TLBounds,
  Intersect,
  Vec,
  TLRenderInfo,
} from '@tldraw/core'
import {
  DashStyle,
  EllipseShape,
  TLDrawShapeType,
  TLDrawShapeUtil,
  TLDrawToolType,
} from '../shape-types'
import { defaultStyle, getPerfectDashProps, getShapeStyle } from '../shape-styles'
import getStroke from 'perfect-freehand'

export class Ellipse extends TLDrawShapeUtil<EllipseShape> {
  type = TLDrawShapeType.Ellipse as const
  toolType = TLDrawToolType.Bounds
  pathCache = new WeakMap<EllipseShape, string>([])

  defaultProps = {
    id: 'id',
    type: TLDrawShapeType.Ellipse as const,
    name: 'Ellipse',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    radius: [1, 1],
    rotation: 0,
    style: defaultStyle,
  }

  render(shape: EllipseShape, { isDarkMode, isBinding }: TLRenderInfo) {
    const {
      radius: [radiusX, radiusY],
      style,
    } = shape

    const styles = getShapeStyle(style, isDarkMode)
    const strokeWidth = +styles.strokeWidth

    const rx = Math.max(0, radiusX - strokeWidth / 2)
    const ry = Math.max(0, radiusY - strokeWidth / 2)

    if (style.dash === DashStyle.Draw) {
      const path = Utils.getFromCache(this.pathCache, shape, () =>
        renderPath(shape, this.getCenter(shape)),
      )

      return (
        <>
          {isBinding && (
            <ellipse
              className="tl-binding-indicator"
              cx={radiusX}
              cy={radiusY}
              rx={rx + 2}
              ry={ry + 2}
            />
          )}
          <ellipse
            cx={radiusX}
            cy={radiusY}
            rx={rx}
            ry={ry}
            stroke="none"
            fill={style.isFilled ? styles.fill : 'transparent'}
            pointerEvents="all"
          />
          <path
            d={path}
            fill={styles.stroke}
            stroke={styles.stroke}
            strokeWidth={strokeWidth}
            pointerEvents="all"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
    }

    const h = Math.pow(rx - ry, 2) / Math.pow(rx + ry, 2)

    const perimeter = Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))

    const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
      perimeter,
      strokeWidth * 1.618,
      shape.style.dash,
      4,
    )

    const sw = strokeWidth * 1.618

    return (
      <>
        {isBinding && (
          <ellipse
            className="tl-binding-indicator"
            cx={radiusX}
            cy={radiusY}
            rx={rx + 32}
            ry={ry + 32}
          />
        )}
        <ellipse
          cx={radiusX}
          cy={radiusY}
          rx={rx}
          ry={ry}
          fill={styles.fill}
          stroke={styles.stroke}
          strokeWidth={sw}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          pointerEvents="all"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    )
  }

  getBounds(shape: EllipseShape) {
    return Utils.getFromCache(this.boundsCache, shape, () => {
      return Utils.getRotatedEllipseBounds(
        shape.point[0],
        shape.point[1],
        shape.radius[0],
        shape.radius[1],
        shape.rotation || 0,
      )
    })
  }

  getRotatedBounds(shape: EllipseShape) {
    return Utils.getBoundsFromPoints(Utils.getRotatedCorners(this.getBounds(shape), shape.rotation))
  }

  getCenter(shape: EllipseShape): number[] {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  hitTest(shape: EllipseShape, point: number[]) {
    return Utils.pointInBounds(point, this.getBounds(shape))
  }

  hitTestBounds(shape: EllipseShape, bounds: TLBounds) {
    const rotatedCorners = Utils.getRotatedCorners(this.getBounds(shape), shape.rotation)

    return (
      rotatedCorners.every((point) => Utils.pointInBounds(point, bounds)) ||
      Intersect.polyline.bounds(rotatedCorners, bounds).length > 0
    )
  }

  transform(
    shape: EllipseShape,
    bounds: TLBounds,
    { scaleX, scaleY, initialShape }: TLTransformInfo<EllipseShape>,
  ) {
    const { rotation = 0 } = initialShape

    return {
      point: [bounds.minX, bounds.minY],
      radius: [bounds.width / 2, bounds.height / 2],
      rotation:
        (scaleX < 0 && scaleY >= 0) || (scaleY < 0 && scaleX >= 0)
          ? -(rotation || 0)
          : rotation || 0,
    }
  }

  transformSingle(shape: EllipseShape, bounds: TLBounds) {
    return {
      point: Vec.round([bounds.minX, bounds.minY]),
      radius: Vec.div([bounds.width, bounds.height], 2),
    }
  }
}

export const ellipse = new Ellipse()

function renderPath(shape: EllipseShape, boundsCenter: number[]) {
  const {
    style,
    id,
    radius: [radiusX, radiusY],
    point,
  } = shape

  const getRandom = Utils.rng(id)

  const center = Vec.sub(boundsCenter, point)

  const strokeWidth = +getShapeStyle(style).strokeWidth

  const rx = radiusX + getRandom() * strokeWidth - strokeWidth / 2
  const ry = radiusY + getRandom() * strokeWidth - strokeWidth / 2

  const points: number[][] = []
  const start = Math.PI + Math.PI * getRandom()

  const overlap = Math.PI / 12

  for (let i = 2; i < 8; i++) {
    const rads = start + overlap * 2 * (i / 8)
    const x = rx * Math.cos(rads) + center[0]
    const y = ry * Math.sin(rads) + center[1]
    points.push([x, y])
  }

  for (let i = 5; i < 32; i++) {
    const t = i / 35
    const rads = start + overlap * 2 + Math.PI * 2.5 * (t * t * t)
    const x = rx * Math.cos(rads) + center[0]
    const y = ry * Math.sin(rads) + center[1]
    points.push([x, y])
  }

  for (let i = 0; i < 8; i++) {
    const rads = start + overlap * 2 * (i / 4)
    const x = rx * Math.cos(rads) + center[0]
    const y = ry * Math.sin(rads) + center[1]
    points.push([x, y])
  }

  const stroke = getStroke(points, {
    size: 1 + strokeWidth,
    thinning: 0.6,
    easing: (t) => t * t * t * t,
    end: { taper: strokeWidth * 20 },
    start: { taper: strokeWidth * 20 },
    simulatePressure: false,
  })

  return Utils.getSvgPathFromStroke(stroke)
}
