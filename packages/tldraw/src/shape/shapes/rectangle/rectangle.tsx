import * as React from 'react'
import { TLBounds, Utils, Vec, TLTransformInfo, Intersect } from '@tldraw/core'
import getStroke from 'perfect-freehand'
import { getPerfectDashProps, defaultStyle, getShapeStyle } from '~shape/shape-styles'
import {
  RectangleShape,
  DashStyle,
  TLDrawShapeUtil,
  TLDrawShapeType,
  TLDrawToolType,
  TLDrawRenderInfo,
} from '~types'

// TODO
// [ ] - Make sure that fill does not extend drawn shape at corners

export class Rectangle extends TLDrawShapeUtil<RectangleShape> {
  type = TLDrawShapeType.Rectangle as const
  toolType = TLDrawToolType.Bounds
  canBind = true

  pathCache = new WeakMap<number[], string>([])

  defaultProps: RectangleShape = {
    id: 'id',
    type: TLDrawShapeType.Rectangle as const,
    name: 'Rectangle',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    size: [1, 1],
    rotation: 0,
    style: defaultStyle,
  }

  shouldRender(prev: RectangleShape, next: RectangleShape) {
    return next.size !== prev.size || next.style !== prev.style
  }

  render(shape: RectangleShape, { isBinding, meta }: TLDrawRenderInfo) {
    const { id, size, style } = shape
    const styles = getShapeStyle(style, meta.isDarkMode)
    const strokeWidth = +styles.strokeWidth

    if (style.dash === DashStyle.Draw) {
      const pathData = Utils.getFromCache(this.pathCache, shape.size, () => renderPath(shape))

      return (
        <>
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
            fill={style.isFilled ? styles.fill : 'transparent'}
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
        </>
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
      <>
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
      </>
    )
  }

  renderIndicator(shape: RectangleShape) {
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
  }

  getBounds(shape: RectangleShape) {
    const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
      const [width, height] = shape.size
      return {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        width,
        height,
      }
    })

    return Utils.translateBounds(bounds, shape.point)
  }

  getRotatedBounds(shape: RectangleShape) {
    return Utils.getBoundsFromPoints(Utils.getRotatedCorners(this.getBounds(shape), shape.rotation))
  }

  getCenter(shape: RectangleShape): number[] {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  getBindingPoint(
    shape: RectangleShape,
    point: number[],
    origin: number[],
    direction: number[],
    padding: number,
    anywhere: boolean
  ) {
    const bounds = this.getBounds(shape)

    const expandedBounds = Utils.expandBounds(bounds, padding)

    let bindingPoint: number[]
    let distance: number

    // The point must be inside of the expanded bounding box
    if (!Utils.pointInBounds(point, expandedBounds)) return

    // The point is inside of the shape, so we'll assume the user is
    // indicating a specific point inside of the shape.
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

      // TODO: Make this a ray vs rounded rect intersection
      const intersection = Intersect.ray
        .bounds(origin, direction, expandedBounds)
        .filter((int) => int.didIntersect)
        .map((int) => int.points[0])
        .sort((a, b) => Vec.dist(b, origin) - Vec.dist(a, origin))[0]

      // The anchor is a point between the handle and the intersection
      const anchor = Vec.med(point, intersection)

      // If we're close to the center, snap to the center
      if (Vec.distanceToLineSegment(point, anchor, this.getCenter(shape)) < 12) {
        bindingPoint = [0.5, 0.5]
      } else {
        // Or else calculate a normalized point
        bindingPoint = Vec.divV(Vec.sub(anchor, [expandedBounds.minX, expandedBounds.minY]), [
          expandedBounds.width,
          expandedBounds.height,
        ])
      }

      if (Utils.pointInBounds(point, bounds)) {
        distance = 16
      } else {
        // If the binding point was close to the shape's center, snap to the center
        // Find the distance between the point and the real bounds of the shape
        distance = Math.max(
          16,
          Utils.getBoundsSides(bounds)
            .map((side) => Vec.distanceToLineSegment(side[1][0], side[1][1], point))
            .sort((a, b) => a - b)[0]
        )
      }
    }

    return {
      point: Vec.clampV(bindingPoint, 0, 1),
      distance,
    }
  }

  hitTest(shape: RectangleShape, point: number[]) {
    return Utils.pointInBounds(point, this.getBounds(shape))
  }

  hitTestBounds(shape: RectangleShape, bounds: TLBounds) {
    const rotatedCorners = Utils.getRotatedCorners(this.getBounds(shape), shape.rotation)

    return (
      rotatedCorners.every((point) => Utils.pointInBounds(point, bounds)) ||
      Intersect.polyline.bounds(rotatedCorners, bounds).length > 0
    )
  }

  transform(
    shape: RectangleShape,
    bounds: TLBounds,
    { initialShape, transformOrigin, scaleX, scaleY }: TLTransformInfo<RectangleShape>
  ) {
    if (!shape.rotation && !shape.isAspectRatioLocked) {
      return {
        point: Vec.round([bounds.minX, bounds.minY]),
        size: Vec.round([bounds.width, bounds.height]),
      }
    } else {
      const size = Vec.round(
        Vec.mul(initialShape.size, Math.min(Math.abs(scaleX), Math.abs(scaleY)))
      )

      const point = Vec.round([
        bounds.minX +
          (bounds.width - shape.size[0]) *
            (scaleX < 0 ? 1 - transformOrigin[0] : transformOrigin[0]),
        bounds.minY +
          (bounds.height - shape.size[1]) *
            (scaleY < 0 ? 1 - transformOrigin[1] : transformOrigin[1]),
      ])

      const rotation =
        (scaleX < 0 && scaleY >= 0) || (scaleY < 0 && scaleX >= 0)
          ? initialShape.rotation
            ? -initialShape.rotation
            : 0
          : initialShape.rotation

      return {
        size,
        point,
        rotation,
      }
    }
  }

  transformSingle(shape: RectangleShape, bounds: TLBounds) {
    return {
      size: Vec.round([bounds.width, bounds.height]),
      point: Vec.round([bounds.minX, bounds.minY]),
    }
  }
}

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
