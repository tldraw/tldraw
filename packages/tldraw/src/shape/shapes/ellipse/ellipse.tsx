import * as React from 'react'
import {
  SVGContainer,
  Utils,
  TLTransformInfo,
  TLBounds,
  Intersect,
  TLShapeProps,
  Vec,
} from '@tldraw/core'
import {
  ArrowShape,
  DashStyle,
  EllipseShape,
  TLDrawShapeType,
  TLDrawShapeUtil,
  TLDrawToolType,
} from '~types'
import { defaultStyle, getPerfectDashProps, getShapeStyle } from '~shape/shape-styles'
import getStroke from 'perfect-freehand'

// TODO
// [ ] Improve indicator shape for drawn shapes

export class Ellipse extends TLDrawShapeUtil<EllipseShape, SVGSVGElement> {
  type = TLDrawShapeType.Ellipse as const
  toolType = TLDrawToolType.Bounds
  pathCache = new WeakMap<EllipseShape, string>([])
  canBind = true

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

  shouldRender(prev: EllipseShape, next: EllipseShape) {
    return next.radius !== prev.radius || next.style !== prev.style
  }

  render = React.forwardRef<SVGSVGElement, TLShapeProps<EllipseShape, SVGSVGElement>>(
    ({ shape, meta, isBinding, events }, ref) => {
      const {
        radius: [radiusX, radiusY],
        style,
      } = shape

      const styles = getShapeStyle(style, meta.isDarkMode)
      const strokeWidth = +styles.strokeWidth

      const rx = Math.max(0, radiusX - strokeWidth / 2)
      const ry = Math.max(0, radiusY - strokeWidth / 2)

      if (style.dash === DashStyle.Draw) {
        const path = Utils.getFromCache(this.pathCache, shape, () =>
          renderPath(shape, this.getCenter(shape))
        )

        return (
          <SVGContainer ref={ref} {...events}>
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
              fill={style.isFilled ? styles.fill : 'none'}
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
          </SVGContainer>
        )
      }

      const h = Math.pow(rx - ry, 2) / Math.pow(rx + ry, 2)

      const perimeter = Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))

      const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
        perimeter,
        strokeWidth * 1.618,
        shape.style.dash,
        4
      )

      const sw = strokeWidth * 1.618

      return (
        <SVGContainer ref={ref} {...events}>
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
        </SVGContainer>
      )
    }
  )

  renderIndicator(shape: EllipseShape) {
    const {
      style,
      radius: [rx, ry],
    } = shape

    const styles = getShapeStyle(style, false)
    const strokeWidth = +styles.strokeWidth

    const sw = strokeWidth

    return <ellipse cx={rx} cy={ry} rx={rx - sw / 2} ry={ry - sw / 2} />
  }

  getBounds(shape: EllipseShape) {
    return Utils.getFromCache(this.boundsCache, shape, () => {
      return Utils.getRotatedEllipseBounds(
        shape.point[0],
        shape.point[1],
        shape.radius[0],
        shape.radius[1],
        shape.rotation || 0
      )
    })
  }

  getRotatedBounds(shape: EllipseShape) {
    return Utils.getBoundsFromPoints(Utils.getRotatedCorners(this.getBounds(shape), shape.rotation))
  }

  getCenter(shape: EllipseShape): number[] {
    return [shape.point[0] + shape.radius[0], shape.point[1] + shape.radius[1]]
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

  getBindingPoint(
    shape: EllipseShape,
    fromShape: ArrowShape,
    point: number[],
    origin: number[],
    direction: number[],
    padding: number,
    anywhere: boolean
  ) {
    {
      const bounds = this.getBounds(shape)

      const expandedBounds = Utils.expandBounds(bounds, padding)

      const center = this.getCenter(shape)

      let bindingPoint: number[]
      let distance: number

      if (!Utils.pointInEllipse(point, center, shape.radius[0] + 32, shape.radius[1] + 32)) return

      if (anywhere) {
        if (Vec.dist(point, this.getCenter(shape)) < 12) {
          bindingPoint = [0.5, 0.5]
        } else {
          bindingPoint = Vec.divV(Vec.sub(point, [expandedBounds.minX, expandedBounds.minY]), [
            expandedBounds.width,
            expandedBounds.height,
          ])
        }

        distance = 0
      } else {
        // Find furthest intersection between ray from
        // origin through point and expanded bounds.
        // const intersection = Intersect.ray
        //   .bounds(origin, direction, expandedBounds)
        //   .filter((int) => int.didIntersect)
        //   .map((int) => int.points[0])
        //   .sort((a, b) => Vec.dist(b, origin) - Vec.dist(a, origin))[0]

        let intersection = Intersect.ray
          .ellipse(origin, direction, center, shape.radius[0], shape.radius[1], shape.rotation || 0)

          .points.sort((a, b) => Vec.dist(a, origin) - Vec.dist(b, origin))[0]

        if (!intersection) {
          intersection = Intersect.lineSegment
            .ellipse(point, center, center, shape.radius[0], shape.radius[1], shape.rotation || 0)
            .points.sort((a, b) => Vec.dist(a, point) - Vec.dist(b, point))[0]
        }

        // The anchor is a point between the handle and the intersection
        const anchor = Vec.med(point, intersection)

        if (Vec.distanceToLineSegment(point, anchor, this.getCenter(shape)) < 12) {
          // If we're close to the center, snap to the center
          bindingPoint = [0.5, 0.5]
        } else {
          // Or else calculate a normalized point
          bindingPoint = Vec.divV(Vec.sub(anchor, [expandedBounds.minX, expandedBounds.minY]), [
            expandedBounds.width,
            expandedBounds.height,
          ])
        }

        if (
          Utils.pointInEllipse(point, center, shape.radius[0], shape.radius[1], shape.rotation || 0)
        ) {
          // Pad the arrow out by 16 points
          distance = 16
        } else {
          // Find the distance between the point and the ellipse
          const innerIntersection = Intersect.lineSegment.ellipse(
            point,
            center,
            center,
            shape.radius[0],
            shape.radius[1],
            shape.rotation || 0
          ).points[0]

          if (!innerIntersection) {
            return undefined
          }

          distance = Math.max(16, Vec.dist(point, innerIntersection))
        }
      }

      return {
        point: bindingPoint,
        distance,
      }
    }
  }

  transform(
    _shape: EllipseShape,
    bounds: TLBounds,
    { scaleX, scaleY, initialShape }: TLTransformInfo<EllipseShape>
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
