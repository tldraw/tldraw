import * as React from 'react'
import { Utils, SVGContainer, TLBounds } from '@tldraw/core'
import { TriangleShape, TDShapeType, TDMeta, TDShape, DashStyle } from '~types'
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
} from '@tldraw/intersect'
import Vec from '@tldraw/vec'
import { BINDING_DISTANCE, GHOSTED_OPACITY } from '~constants'
import { getOffsetPolygon } from '../shared/PolygonUtils'
import getStroke, { getStrokePoints } from 'perfect-freehand'

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
    ({ shape, isBinding, isSelected, isGhost, meta, events }, ref) => {
      const { id, style } = shape

      const styles = getShapeStyle(style, meta.isDarkMode)

      const { strokeWidth } = styles

      const sw = 1 + strokeWidth * 1.618

      if (style.dash === DashStyle.Draw) {
        const pathTDSnapshot = getTrianglePath(shape)
        const indicatorPath = getTriangleIndicatorPathTDSnapshot(shape)
        const trianglePoints = getTrianglePoints(shape).join()

        return (
          <SVGContainer ref={ref} id={shape.id + '_svg'} {...events}>
            {isBinding && (
              <polygon
                className="tl-binding-indicator"
                points={trianglePoints}
                strokeWidth={this.bindingDistance * 2}
              />
            )}
            <path
              className={style.isFilled || isSelected ? 'tl-fill-hitarea' : 'tl-stroke-hitarea'}
              d={indicatorPath}
            />
            <path
              d={indicatorPath}
              fill={style.isFilled ? styles.fill : 'none'}
              pointerEvents="none"
            />
            <path
              d={pathTDSnapshot}
              fill={styles.stroke}
              stroke={styles.stroke}
              strokeWidth={styles.strokeWidth}
              pointerEvents="none"
              opacity={isGhost ? GHOSTED_OPACITY : 1}
            />
          </SVGContainer>
        )
      }

      const points = getTrianglePoints(shape)
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
              points={points.join()}
              strokeWidth={this.bindingDistance * 2}
            />
          )}
          <polygon
            className={style.isFilled || isSelected ? 'tl-fill-hitarea' : 'tl-stroke-hitarea'}
            points={points.join()}
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
    return <polygon points={getTrianglePoints(shape).join()} />
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
      getTrianglePoints(shape, this.bindingDistance).map((pt) => Vec.add(pt, shape.point))
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

  hitTestBindingPoint = (shape: T, point: number[]): boolean => {
    const expandedBounds = this.getExpandedBounds(shape)
    if (!Utils.pointInBounds(point, expandedBounds)) return false
    const relativePoint = Vec.sub(point, shape.point)
    return (
      Utils.pointInPolygon(relativePoint, getTrianglePoints(shape, this.bindingDistance)) ||
      Utils.pointsToLineSegments(getTrianglePoints(shape), true)
        .map(([a, b]) => Vec.distanceToLineSegment(a, b, relativePoint))
        .sort((a, b) => a - b)[0] < this.bindingDistance
    )
  }

  transform = transformRectangle

  transformSingle = transformSingleRectangle
}

/* -------------------------------------------------- */
/*                       Helpers                      */
/* -------------------------------------------------- */

export function getTrianglePoints(shape: T, offset = 0, rotation = 0) {
  const {
    size: [w, h],
  } = shape

  let points = [
    [w / 2, 0],
    [w, h],
    [0, h],
  ]

  if (offset) points = getOffsetPolygon(points, offset)
  if (rotation) points = points.map((pt) => Vec.rotWith(pt, [w / 2, h / 2], rotation))

  return points
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

function getTriangleDrawPoints(shape: TriangleShape) {
  const styles = getShapeStyle(shape.style)

  const {
    size: [w, h],
  } = shape

  const getRandom = Utils.rng(shape.id)

  const sw = styles.strokeWidth

  // Random corner offsets
  const offsets = Array.from(Array(3)).map(() => {
    return [getRandom() * sw * 0.75, getRandom() * sw * 0.75]
  })

  // Corners
  const corners = [
    Vec.add([w / 2, 0], offsets[0]),
    Vec.add([w, h], offsets[1]),
    Vec.add([0, h], offsets[2]),
  ]

  // Which side to start drawing first
  const rm = Math.round(Math.abs(getRandom() * 2 * 3))

  // Number of points per side

  // Inset each line by the corner radii and let the freehand algo
  // interpolate points for the corners.
  const lines = Utils.rotateArray(
    [
      Vec.pointsBetween(corners[0], corners[1], 32),
      Vec.pointsBetween(corners[1], corners[2], 32),
      Vec.pointsBetween(corners[2], corners[0], 32),
    ],
    rm
  )

  // For the final points, include the first half of the first line again,
  // so that the line wraps around and avoids ending on a sharp corner.
  // This has a bit of finesse and magic—if you change the points between
  // function, then you'll likely need to change this one too.

  const points = [...lines.flat(), ...lines[0]]

  return {
    points,
  }
}

function getDrawStrokeInfo(shape: TriangleShape) {
  const { points } = getTriangleDrawPoints(shape)

  const { strokeWidth } = getShapeStyle(shape.style)

  const options = {
    size: strokeWidth,
    thinning: 0.65,
    streamline: 0.3,
    smoothing: 1,
    simulatePressure: false,
    last: true,
  }

  return { points, options }
}

function getTrianglePath(shape: TriangleShape) {
  const { points, options } = getDrawStrokeInfo(shape)

  const stroke = getStroke(points, options)

  return Utils.getSvgPathFromStroke(stroke)
}

function getTriangleIndicatorPathTDSnapshot(shape: TriangleShape) {
  const { points, options } = getDrawStrokeInfo(shape)

  const strokePoints = getStrokePoints(points, options)

  return Utils.getSvgPathFromStroke(
    strokePoints.map((pt) => pt.point.slice(0, 2)),
    false
  )
}
