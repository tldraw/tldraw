import * as React from 'react'
import { Utils, SVGContainer, TLBounds } from '@tldraw/core'
import { TriangleShape, TDShapeType, TDMeta, TDShape } from '~types'
import { TDShapeUtil } from '../TDShapeUtil'
import {
  defaultStyle,
  getShapeStyle,
  getBoundsRectangle,
  transformRectangle,
  transformSingleRectangle,
} from '~state/shapes/shared'
import {
  intersectBoundsPolygon,
  intersectLineSegmentPolyline,
  intersectRayLineSegment,
  intersectRayPolygon,
  pointsToLineSegments,
} from '@tldraw/intersect'
import Vec from '@tldraw/vec'
import { BINDING_DISTANCE } from '~constants'

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
      const { id, style } = shape

      const styles = getShapeStyle(style, meta.isDarkMode)

      const { strokeWidth } = styles

      const sw = 1 + strokeWidth * 1.618

      const points = getTrianglePoints(shape, sw / 2)
      const sides = Utils.pointsToLineSegments(points, true)
      const paths = sides.map(([start, end], i) => {
        const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
          Vec.dist(start, end),
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
            <polygon
              className="tl-binding-indicator"
              points={getTrianglePoints(shape, 32).join()}
            />
          )}
          <polygon
            points={getTrianglePoints(shape).join()}
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
    const { style } = shape
    const styles = getShapeStyle(style, false)
    const sw = styles.strokeWidth
    return <polygon points={getTrianglePoints(shape, sw).join()} />
  })

  private getPoints(shape: T) {
    const {
      rotation = 0,
      point: [x, y],
      size: [w, h],
    } = shape
    return [
      [x + w / 2, y],
      [x, y + h],
      [x + w, y + h],
    ].map((pt) => Vec.rotWith(pt, this.getCenter(shape), rotation))
  }

  shouldRender = (prev: T, next: T) => {
    return next.size !== prev.size || next.style !== prev.style
  }

  getBounds = (shape: T) => {
    return getBoundsRectangle(shape, this.boundsCache)
  }

  getExpandedBounds = (shape: T) => {
    return Utils.getBoundsFromPoints(
      getTrianglePoints(shape, BINDING_DISTANCE).map((pt) => Vec.add(pt, shape.point))
    )
  }

  hitTestLineSegment = (shape: T, A: number[], B: number[]): boolean => {
    return intersectLineSegmentPolyline(A, B, this.getPoints(shape)).didIntersect
  }

  hitTestBounds = (shape: T, bounds: TLBounds): boolean => {
    return (
      Utils.boundsContained(this.getBounds(shape), bounds) ||
      intersectBoundsPolygon(bounds, this.getPoints(shape)).length > 0
    )
  }

  getBindingPoint = <K extends TDShape>(
    shape: T,
    fromShape: K,
    point: number[],
    origin: number[],
    direction: number[],
    padding: number,
    bindAnywhere: boolean
  ) => {
    // Algorithm time! We need to find the binding point (a normalized point inside of the shape, or around the shape, where the arrow will point to) and the distance from the binding shape to the anchor.

    let bindingPoint: number[]

    let distance: number

    const bounds = this.getBounds(shape)
    const expandedBounds = this.getExpandedBounds(shape)

    const points = getTrianglePoints(shape).map((pt) => Vec.add(pt, shape.point))
    const sides = pointsToLineSegments(points)

    const expandedPoints = getTrianglePoints(shape, padding).map((pt) => Vec.add(pt, shape.point))

    const segments = Utils.pointsToLineSegments(expandedPoints.concat([expandedPoints[0]]))

    const intersections = segments
      .map((segment) => intersectRayLineSegment(origin, direction, segment[0], segment[1]))
      .filter((intersection) => intersection.didIntersect)
      .flatMap((intersection) => intersection.points)

    if (!intersections.length) return

    // The point is inside of the shape, so we'll assume the user is indicating a specific point inside of the shape.
    if (bindAnywhere) {
      if (Vec.dist(point, getTriangleCentroid(shape)) < 12) {
        bindingPoint = [0.5, 0.5]
      } else {
        bindingPoint = Vec.divV(
          Vec.sub(Vec.med(intersections[0], intersections[1]), [
            expandedBounds.minX,
            expandedBounds.minY,
          ]),
          [expandedBounds.width, expandedBounds.height]
        )
      }

      distance = 0
    } else {
      // (1) Binding point

      // Find furthest intersection between ray from origin through point and expanded bounds. TODO: What if the shape has a curve? In that case, should we intersect the circle-from-three-points instead?

      const intersection = intersections.sort(
        (a, b) => Vec.dist(b, origin) - Vec.dist(a, origin)
      )[0]

      // The anchor is a point between the handle and the intersection
      const anchor = Vec.med(point, intersection)

      // If we're close to the center, snap to the center, or else calculate a normalized point based on the anchor and the expanded bounds.

      const centroid = getTriangleCentroid(shape)

      if (Vec.distanceToLineSegment(point, anchor, centroid) < 12) {
        bindingPoint = Vec.divV(Vec.sub(centroid, [bounds.minX, bounds.minY]), [
          bounds.width,
          bounds.height,
        ])
      } else {
        bindingPoint = Vec.divV(Vec.sub(anchor, [bounds.minX, bounds.minY]), [
          bounds.width,
          bounds.height,
        ])
      }

      // (3) Distance

      // If the point is inside of the bounds, set the distance to a fixed value.
      if (Utils.pointInPolygon(point, points)) {
        distance = 16
      } else {
        // If the binding point was close to the shape's center, snap to to the center. Find the distance between the point and the real bounds of the shape
        distance = Math.max(
          16,
          sides.map(([a, b]) => Vec.distanceToLineSegment(a, b, point)).sort((a, b) => a - b)[0]
        )
      }
    }

    return {
      point: Vec.clampV(bindingPoint, 0, 1),
      distance,
    }
  }

  transform = transformRectangle

  transformSingle = transformSingleRectangle
}

/* -------------------------------------------------- */
/*                       Helpers                      */
/* -------------------------------------------------- */

export function getTrianglePoints(shape: T, offset = 0) {
  const {
    size: [w, h],
    rotation = 0,
  } = shape

  const points = [
    [w / 2, 0],
    [w, h],
    [0, h],
  ]

  const centroid = getTriangleCentroid(shape)

  return points
    .map((pt) => Vec.rotWith(pt, centroid, rotation))
    .map((pt) => Vec.nudge(pt, centroid, -offset))
}

export function getTriangleCentroid(shape: T) {
  const {
    size: [w, h],
  } = shape

  const points = [
    [w / 2, 0],
    [w, h],
    [0, h],
  ]

  return [
    (points[0][0] + points[1][0] + points[2][0]) / 3,
    (points[0][1] + points[1][1] + points[2][1]) / 3,
  ]
}
