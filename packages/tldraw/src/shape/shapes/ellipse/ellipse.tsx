import * as React from 'react'
import { SVGContainer, Utils, ShapeUtil, TLTransformInfo, TLBounds } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import { DashStyle, EllipseShape, TLDrawShapeType, TLDrawMeta, TLDrawToolType } from '~types'
import { defaultStyle, getPerfectDashProps, getShapeStyle } from '~shape/shape-styles'
import getStroke from 'perfect-freehand'
import {
  intersectBoundsEllipse,
  intersectLineSegmentEllipse,
  intersectRayEllipse,
} from '@tldraw/intersect'
import { EASINGS } from '~state/utils'

export const Ellipse = new ShapeUtil<EllipseShape, SVGSVGElement, TLDrawMeta>(() => ({
  type: TLDrawShapeType.Ellipse,

  toolType: TLDrawToolType.Bounds,

  pathCache: new WeakMap<EllipseShape, string>([]),

  canBind: true,

  defaultProps: {
    id: 'id',
    type: TLDrawShapeType.Ellipse,
    name: 'Ellipse',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    radius: [1, 1],
    rotation: 0,
    style: defaultStyle,
  },

  Component({ shape, meta, isBinding, events }, ref) {
    const {
      radius: [radiusX, radiusY],
      style,
    } = shape

    const styles = getShapeStyle(style, meta.isDarkMode)
    const strokeWidth = +styles.strokeWidth

    const rx = Math.max(0, radiusX - strokeWidth / 2)
    const ry = Math.max(0, radiusY - strokeWidth / 2)

    if (style.dash === DashStyle.Draw) {
      const path = getEllipsePath(shape, this.getCenter(shape))

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
  },

  Indicator({ shape }) {
    const {
      style,
      radius: [rx, ry],
    } = shape

    const styles = getShapeStyle(style, false)
    const strokeWidth = +styles.strokeWidth

    const sw = strokeWidth

    // TODO Improve indicator shape for drawn shapes, which are
    // intentionally not perfect circles.
    return <ellipse cx={rx} cy={ry} rx={rx - sw / 2} ry={ry - sw / 2} />
  },

  shouldRender(prev, next) {
    return next.radius !== prev.radius || next.style !== prev.style
  },

  getBounds(shape) {
    return Utils.getFromCache(this.boundsCache, shape, () => {
      return Utils.getRotatedEllipseBounds(
        shape.point[0],
        shape.point[1],
        shape.radius[0],
        shape.radius[1],
        0
      )
    })
  },

  getRotatedBounds(shape) {
    return Utils.getRotatedEllipseBounds(
      shape.point[0],
      shape.point[1],
      shape.radius[0],
      shape.radius[1],
      shape.rotation
    )
  },

  getCenter(shape): number[] {
    return [shape.point[0] + shape.radius[0], shape.point[1] + shape.radius[1]]
  },

  hitTest(shape, point: number[]) {
    return Utils.pointInEllipse(
      point,
      this.getCenter(shape),
      shape.radius[0],
      shape.radius[1],
      shape.rotation
    )
  },

  hitTestBounds(shape, bounds) {
    return (
      intersectBoundsEllipse(
        bounds,
        this.getCenter(shape),
        shape.radius[0],
        shape.radius[1],
        shape.rotation
      ).length > 0
    )
  },

  getBindingPoint(shape, fromShape, point, origin, direction, padding, anywhere) {
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
        let intersection = intersectRayEllipse(
          origin,
          direction,
          center,
          shape.radius[0],
          shape.radius[1],
          shape.rotation || 0
        ).points.sort((a, b) => Vec.dist(a, origin) - Vec.dist(b, origin))[0]

        if (!intersection) {
          intersection = intersectLineSegmentEllipse(
            point,
            center,
            center,
            shape.radius[0],
            shape.radius[1],
            shape.rotation || 0
          ).points.sort((a, b) => Vec.dist(a, point) - Vec.dist(b, point))[0]
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
          const innerIntersection = intersectLineSegmentEllipse(
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
  },

  transform(
    _shape,
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
  },

  transformSingle(shape, bounds: TLBounds) {
    return {
      point: Vec.round([bounds.minX, bounds.minY]),
      radius: Vec.div([bounds.width, bounds.height], 2),
    }
  },
}))

/* -------------------------------------------------- */
/*                       Helpers                      */
/* -------------------------------------------------- */

function getEllipsePath(shape: EllipseShape, boundsCenter: number[]) {
  const {
    style,
    id,
    radius: [radiusX, radiusY],
    point,
  } = shape

  const getRandom = Utils.rng(id)

  const center = Vec.sub(boundsCenter, point)

  const strokeWidth = +getShapeStyle(style).strokeWidth

  const rx = radiusX + getRandom() * strokeWidth * 2
  const ry = radiusY + getRandom() * strokeWidth * 2

  const points: number[][] = []

  const start = Math.PI + Math.PI * getRandom()

  const extra = Math.abs(getRandom())

  const perimeter = Utils.perimeterOfEllipse(rx, ry)

  const count = Math.max(16, perimeter / 10)

  for (let i = 0; i < count; i++) {
    const t = EASINGS.easeInOutSine(i / (count + 1))
    const rads = start * 2 + Math.PI * (2 + extra) * t
    const c = Math.cos(rads)
    const s = Math.sin(rads)
    points.push([rx * c + center[0], ry * s + center[1], t + 0.5 + getRandom() / 2])
  }

  const stroke = getStroke(points, {
    size: 1 + strokeWidth * 2,
    thinning: 0.5,
    end: { taper: perimeter / 8 },
    start: { taper: perimeter / 12 },
    streamline: 0,
    simulatePressure: true,
  })

  return Utils.getSvgPathFromStroke(stroke)
}
