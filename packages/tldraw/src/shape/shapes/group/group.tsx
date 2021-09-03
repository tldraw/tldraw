import * as React from 'react'
import { TLBounds, Utils, Vec, TLTransformInfo, Intersect } from '@tldraw/core'
import { defaultStyle, getPerfectDashProps } from '~shape/shape-styles'
import {
  GroupShape,
  TLDrawShapeUtil,
  TLDrawShapeType,
  TLDrawToolType,
  TLDrawRenderInfo,
  ColorStyle,
  DashStyle,
  ArrowShape,
} from '~types'

// TODO
// [ ] - Find bounds based on common bounds of descendants

export class Group extends TLDrawShapeUtil<GroupShape> {
  type = TLDrawShapeType.Group as const
  toolType = TLDrawToolType.Bounds
  canBind = true

  pathCache = new WeakMap<number[], string>([])

  defaultProps: GroupShape = {
    id: 'id',
    type: TLDrawShapeType.Group as const,
    name: 'Group',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    size: [100, 100],
    rotation: 0,
    children: [],
    style: defaultStyle,
  }

  shouldRender(prev: GroupShape, next: GroupShape) {
    return next.size !== prev.size || next.style !== prev.style
  }

  render(shape: GroupShape, { isBinding, isHovered, isSelected }: TLDrawRenderInfo) {
    const { id, size } = shape

    const sw = 2
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
        DashStyle.Dotted
      )

      return (
        <line
          key={id + '_' + i}
          x1={start[0]}
          y1={start[1]}
          x2={end[0]}
          y2={end[1]}
          stroke={ColorStyle.Black}
          strokeWidth={isHovered || isSelected ? sw : 0}
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
            x={-32}
            y={-32}
            width={size[0] + 64}
            height={size[1] + 64}
          />
        )}
        <rect x={0} y={0} width={size[0]} height={size[1]} fill="transparent" pointerEvents="all" />
        <g pointerEvents="stroke">{paths}</g>
      </>
    )
  }

  renderIndicator(shape: GroupShape) {
    const [width, height] = shape.size

    const sw = 2

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

  getBounds(shape: GroupShape) {
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

  getRotatedBounds(shape: GroupShape) {
    return Utils.getBoundsFromPoints(Utils.getRotatedCorners(this.getBounds(shape), shape.rotation))
  }

  getCenter(shape: GroupShape): number[] {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  getBindingPoint(
    shape: GroupShape,
    fromShape: ArrowShape,
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

  hitTest(shape: GroupShape, point: number[]) {
    return Utils.pointInBounds(point, this.getBounds(shape))
  }

  hitTestBounds(shape: GroupShape, bounds: TLBounds) {
    const rotatedCorners = Utils.getRotatedCorners(this.getBounds(shape), shape.rotation)

    return (
      rotatedCorners.every((point) => Utils.pointInBounds(point, bounds)) ||
      Intersect.polyline.bounds(rotatedCorners, bounds).length > 0
    )
  }

  transform() {
    return {}
  }

  transformSingle() {
    return {}
  }
}
