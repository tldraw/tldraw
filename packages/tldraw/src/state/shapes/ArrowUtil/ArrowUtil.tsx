import * as React from 'react'
import { Utils, TLBounds, SVGContainer } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import { defaultStyle, getShapeStyle } from '../shared/shape-styles'
import {
  ArrowShape,
  TransformInfo,
  Decoration,
  TDShapeType,
  TDShape,
  EllipseShape,
  TDBinding,
  DashStyle,
  TDMeta,
} from '~types'
import { TDShapeUtil } from '../TDShapeUtil'
import {
  intersectArcBounds,
  intersectLineSegmentBounds,
  intersectLineSegmentLineSegment,
  intersectRayBounds,
  intersectRayEllipse,
} from '@tldraw/intersect'
import { BINDING_DISTANCE, EASINGS, GHOSTED_OPACITY } from '~constants'
import {
  getArcPoints,
  getArrowArc,
  getArrowArcPath,
  getArrowPath,
  getBendPoint,
  getCtp,
  getCurvedArrowHeadPoints,
  getStraightArrowHeadPoints,
  isAngleBetween,
  renderCurvedFreehandArrowShaft,
  renderFreehandArrowShaft,
} from './arrowHelpers'

type T = ArrowShape
type E = SVGSVGElement

export class ArrowUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Arrow as const

  hideBounds = true

  pathCache = new WeakMap<T, string>()

  getShape = (props: Partial<T>): T => {
    return {
      id: 'id',
      type: TDShapeType.Arrow,
      name: 'Arrow',
      parentId: 'page',
      childIndex: 1,
      point: [0, 0],
      rotation: 0,
      bend: 0,
      handles: {
        start: {
          id: 'start',
          index: 0,
          point: [0, 0],
          canBind: true,
          ...props.handles?.start,
        },
        end: {
          id: 'end',
          index: 1,
          point: [1, 1],
          canBind: true,
          ...props.handles?.end,
        },
        bend: {
          id: 'bend',
          index: 2,
          point: [0.5, 0.5],
          ...props.handles?.bend,
        },
      },
      decorations: props.decorations ?? {
        end: Decoration.Arrow,
      },
      style: {
        ...defaultStyle,
        isFilled: false,
        ...props.style,
      },
      ...props,
    }
  }

  Component = TDShapeUtil.Component<T, E, TDMeta>(({ shape, isGhost, meta, events }, ref) => {
    const {
      handles: { start, bend, end },
      decorations = {},
      style,
    } = shape

    const isDraw = style.dash === DashStyle.Draw

    const isStraightLine = Vec.dist(bend.point, Vec.toFixed(Vec.med(start.point, end.point))) < 1

    const styles = getShapeStyle(style, meta.isDarkMode)

    const { strokeWidth } = styles

    const arrowDist = Vec.dist(start.point, end.point)

    const arrowHeadLength = Math.min(arrowDist / 3, strokeWidth * 8)

    const sw = 1 + strokeWidth * 1.618

    let shaftPath: JSX.Element | null
    let startArrowHead: { left: number[]; right: number[] } | undefined
    let endArrowHead: { left: number[]; right: number[] } | undefined

    const getRandom = Utils.rng(shape.id)

    const easing = EASINGS[getRandom() > 0 ? 'easeInOutSine' : 'easeInOutCubic']

    if (isStraightLine) {
      const path = isDraw
        ? renderFreehandArrowShaft(shape)
        : 'M' + Vec.toFixed(start.point) + 'L' + Vec.toFixed(end.point)

      const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
        arrowDist,
        strokeWidth * 1.618,
        shape.style.dash,
        2,
        false
      )

      if (decorations.start) {
        startArrowHead = getStraightArrowHeadPoints(start.point, end.point, arrowHeadLength)
      }

      if (decorations.end) {
        endArrowHead = getStraightArrowHeadPoints(end.point, start.point, arrowHeadLength)
      }

      // Straight arrow path
      shaftPath =
        arrowDist > 2 ? (
          <>
            <path
              d={path}
              fill="none"
              strokeWidth={Math.max(8, strokeWidth * 2)}
              strokeDasharray="none"
              strokeDashoffset="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="stroke"
            />
            <path
              d={path}
              fill={styles.stroke}
              stroke={styles.stroke}
              strokeWidth={isDraw ? sw / 2 : sw}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="stroke"
            />
          </>
        ) : null
    } else {
      const circle = getCtp(shape)

      const { center, radius, length } = getArrowArc(shape)

      const path = isDraw
        ? renderCurvedFreehandArrowShaft(shape, circle, length, easing)
        : getArrowArcPath(start, end, circle, shape.bend)

      const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
        Math.abs(length),
        sw,
        shape.style.dash,
        2,
        false
      )

      if (decorations.start) {
        startArrowHead = getCurvedArrowHeadPoints(
          start.point,
          arrowHeadLength,
          center,
          radius,
          length < 0
        )
      }

      if (decorations.end) {
        endArrowHead = getCurvedArrowHeadPoints(
          end.point,
          arrowHeadLength,
          center,
          radius,
          length >= 0
        )
      }

      // Curved arrow path
      shaftPath = (
        <>
          <path
            d={path}
            fill="none"
            stroke="none"
            strokeWidth={Math.max(8, strokeWidth)}
            strokeDasharray="none"
            strokeDashoffset="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="stroke"
          />
          <path
            d={path}
            fill={isDraw ? styles.stroke : 'none'}
            stroke={styles.stroke}
            strokeWidth={isDraw ? 0 : sw}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="stroke"
          />
        </>
      )
    }

    return (
      <SVGContainer ref={ref} id={shape.id + '_svg'} {...events}>
        <g pointerEvents="none" opacity={isGhost ? GHOSTED_OPACITY : 1}>
          {shaftPath}
          {startArrowHead && (
            <path
              d={`M ${startArrowHead.left} L ${start.point} ${startArrowHead.right}`}
              fill="none"
              stroke={styles.stroke}
              strokeWidth={sw}
              strokeDashoffset="none"
              strokeDasharray="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="stroke"
            />
          )}
          {endArrowHead && (
            <path
              d={`M ${endArrowHead.left} L ${end.point} ${endArrowHead.right}`}
              fill="none"
              stroke={styles.stroke}
              strokeWidth={sw}
              strokeDashoffset="none"
              strokeDasharray="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="stroke"
            />
          )}
        </g>
      </SVGContainer>
    )
  })

  Indicator = TDShapeUtil.Indicator<ArrowShape>(({ shape }) => {
    return <path d={getArrowPath(shape)} />
  })

  getBounds = (shape: T) => {
    const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
      return Utils.getBoundsFromPoints(getArcPoints(shape))
    })

    return Utils.translateBounds(bounds, shape.point)
  }

  getRotatedBounds = (shape: T) => {
    let points = getArcPoints(shape)

    const { minX, minY, maxX, maxY } = Utils.getBoundsFromPoints(points)

    if (shape.rotation !== 0) {
      points = points.map((pt) =>
        Vec.rotWith(pt, [(minX + maxX) / 2, (minY + maxY) / 2], shape.rotation || 0)
      )
    }

    return Utils.translateBounds(Utils.getBoundsFromPoints(points), shape.point)
  }

  getCenter = (shape: T) => {
    const { start, end } = shape.handles
    return Vec.add(shape.point, Vec.med(start.point, end.point))
  }

  shouldRender = (prev: T, next: T) => {
    return (
      next.decorations !== prev.decorations ||
      next.handles !== prev.handles ||
      next.style !== prev.style
    )
  }

  hitTestPoint = (shape: T, point: number[]): boolean => {
    const pt = Vec.sub(point, shape.point)
    const points = getArcPoints(shape)

    for (let i = 1; i < points.length; i++) {
      if (Vec.distanceToLineSegment(points[i - 1], points[i], pt) < 1) {
        return true
      }
    }

    return false
  }

  hitTestLineSegment = (shape: T, A: number[], B: number[]): boolean => {
    const ptA = Vec.sub(A, shape.point)
    const ptB = Vec.sub(B, shape.point)

    const points = getArcPoints(shape)

    for (let i = 1; i < points.length; i++) {
      if (intersectLineSegmentLineSegment(points[i - 1], points[i], ptA, ptB).didIntersect) {
        return true
      }
    }

    return false
  }

  hitTestBounds = (shape: T, bounds: TLBounds) => {
    const { start, end, bend } = shape.handles

    const sp = Vec.add(shape.point, start.point)

    const ep = Vec.add(shape.point, end.point)

    if (Utils.pointInBounds(sp, bounds) || Utils.pointInBounds(ep, bounds)) {
      return true
    }

    if (Vec.isEqual(Vec.med(start.point, end.point), bend.point)) {
      return intersectLineSegmentBounds(sp, ep, bounds).length > 0
    } else {
      const [cx, cy, r] = getCtp(shape)

      const cp = Vec.add(shape.point, [cx, cy])

      return intersectArcBounds(cp, r, sp, ep, bounds).length > 0
    }
  }

  transform = (
    shape: T,
    bounds: TLBounds,
    { initialShape, scaleX, scaleY }: TransformInfo<T>
  ): Partial<T> => {
    const initialShapeBounds = this.getBounds(initialShape)

    const handles: (keyof T['handles'])[] = ['start', 'end']

    const nextHandles = { ...initialShape.handles }

    handles.forEach((handle) => {
      const [x, y] = nextHandles[handle].point

      const nw = x / initialShapeBounds.width

      const nh = y / initialShapeBounds.height

      nextHandles[handle] = {
        ...nextHandles[handle],
        point: [
          bounds.width * (scaleX < 0 ? 1 - nw : nw),
          bounds.height * (scaleY < 0 ? 1 - nh : nh),
        ],
      }
    })

    const { start, bend, end } = nextHandles

    const dist = Vec.dist(start.point, end.point)

    const midPoint = Vec.med(start.point, end.point)

    const bendDist = (dist / 2) * initialShape.bend

    const u = Vec.uni(Vec.vec(start.point, end.point))

    const point = Vec.add(midPoint, Vec.mul(Vec.per(u), bendDist))

    nextHandles['bend'] = {
      ...bend,
      point: Vec.toFixed(Math.abs(bendDist) < 10 ? midPoint : point),
    }

    return {
      point: Vec.toFixed([bounds.minX, bounds.minY]),
      handles: nextHandles,
    }
  }

  onDoubleClickHandle = (shape: T, handle: Partial<T['handles']>): Partial<T> | void => {
    switch (handle) {
      case 'bend': {
        return {
          bend: 0,
          handles: {
            ...shape.handles,
            bend: {
              ...shape.handles.bend,
              point: getBendPoint(shape.handles, shape.bend),
            },
          },
        }
      }
      case 'start': {
        return {
          decorations: {
            ...shape.decorations,
            start: shape.decorations?.start ? undefined : Decoration.Arrow,
          },
        }
      }
      case 'end': {
        return {
          decorations: {
            ...shape.decorations,
            end: shape.decorations?.end ? undefined : Decoration.Arrow,
          },
        }
      }
    }

    return this
  }

  onBindingChange = (
    shape: T,
    binding: TDBinding,
    target: TDShape,
    targetBounds: TLBounds,
    center: number[]
  ): Partial<T> | void => {
    const handle = shape.handles[binding.handleId as keyof ArrowShape['handles']]

    const expandedBounds = Utils.expandBounds(targetBounds, BINDING_DISTANCE)

    // The anchor is the "actual" point in the target shape
    // (Remember that the binding.point is normalized)
    const anchor = Vec.sub(
      Vec.add(
        [expandedBounds.minX, expandedBounds.minY],
        Vec.mulV(
          [expandedBounds.width, expandedBounds.height],
          Vec.rotWith(binding.point, [0.5, 0.5], target.rotation || 0)
        )
      ),
      shape.point
    )

    // We're looking for the point to put the dragging handle
    let handlePoint = anchor

    if (binding.distance) {
      const intersectBounds = Utils.expandBounds(targetBounds, binding.distance)

      // The direction vector starts from the arrow's opposite handle
      const origin = Vec.add(
        shape.point,
        shape.handles[handle.id === 'start' ? 'end' : 'start'].point
      )

      // And passes through the dragging handle
      const direction = Vec.uni(Vec.sub(Vec.add(anchor, shape.point), origin))

      if (target.type === TDShapeType.Ellipse) {
        const hits = intersectRayEllipse(
          origin,
          direction,
          center,
          (target as EllipseShape).radius[0] + binding.distance,
          (target as EllipseShape).radius[1] + binding.distance,
          target.rotation || 0
        ).points.sort((a, b) => Vec.dist(a, origin) - Vec.dist(b, origin))

        if (hits[0]) {
          handlePoint = Vec.sub(hits[0], shape.point)
        }
      } else {
        let hits = intersectRayBounds(origin, direction, intersectBounds, target.rotation)
          .filter((int) => int.didIntersect)
          .map((int) => int.points[0])
          .sort((a, b) => Vec.dist(a, origin) - Vec.dist(b, origin))

        if (hits.length < 2) {
          hits = intersectRayBounds(origin, Vec.neg(direction), intersectBounds)
            .filter((int) => int.didIntersect)
            .map((int) => int.points[0])
            .sort((a, b) => Vec.dist(a, origin) - Vec.dist(b, origin))
        }

        if (hits[0]) {
          handlePoint = Vec.sub(hits[0], shape.point)
        }
      }
    }

    return this.onHandleChange(shape, {
      [handle.id]: {
        ...handle,
        point: Vec.toFixed(handlePoint),
      },
    })
  }

  onHandleChange = (shape: T, handles: Partial<T['handles']>): Partial<T> | void => {
    let nextHandles = Utils.deepMerge<ArrowShape['handles']>(shape.handles, handles)
    let nextBend = shape.bend

    nextHandles = {
      ...nextHandles,
      start: {
        ...nextHandles.start,
        point: Vec.toFixed(nextHandles.start.point),
      },
      end: {
        ...nextHandles.end,
        point: Vec.toFixed(nextHandles.end.point),
      },
    }

    // If the user is moving the bend handle, we want to move the bend point
    if ('bend' in handles) {
      const { start, end, bend } = nextHandles

      const distance = Vec.dist(start.point, end.point)

      const midPoint = Vec.med(start.point, end.point)

      const angle = Vec.angle(start.point, end.point)

      const u = Vec.uni(Vec.vec(start.point, end.point))

      // Create a line segment perendicular to the line between the start and end points
      const ap = Vec.add(midPoint, Vec.mul(Vec.per(u), distance / 2))
      const bp = Vec.sub(midPoint, Vec.mul(Vec.per(u), distance / 2))

      const bendPoint = Vec.nearestPointOnLineSegment(ap, bp, bend.point, true)

      // Find the distance between the midpoint and the nearest point on the
      // line segment to the bend handle's dragged point
      const bendDist = Vec.dist(midPoint, bendPoint)

      // The shape's "bend" is the ratio of the bend to the distance between
      // the start and end points. If the bend is below a certain amount, the
      // bend should be zero.
      nextBend = Utils.clamp(bendDist / (distance / 2), -0.99, 0.99)

      // If the point is to the left of the line segment, we make the bend
      // negative, otherwise it's positive.
      const angleToBend = Vec.angle(start.point, bendPoint)

      // If resulting bend is low enough that the handle will snap to center,
      // then also snap the bend to center
      if (Vec.isEqual(midPoint, getBendPoint(nextHandles, nextBend))) {
        nextBend = 0
      } else if (isAngleBetween(angle, angle + Math.PI, angleToBend)) {
        // Otherwise, fix the bend direction
        nextBend *= -1
      }
    }

    const nextShape = {
      point: shape.point,
      bend: nextBend,
      handles: {
        ...nextHandles,
        bend: {
          ...nextHandles.bend,
          point: getBendPoint(nextHandles, nextBend),
        },
      },
    }

    // Zero out the handles to prevent handles with negative points. If a handle's x or y
    // is below zero, we need to move the shape left or up to make it zero.

    const topLeft = shape.point

    const nextBounds = this.getBounds({ ...nextShape } as ArrowShape)

    const offset = Vec.sub([nextBounds.minX, nextBounds.minY], topLeft)

    if (!Vec.isEqual(offset, [0, 0])) {
      Object.values(nextShape.handles).forEach((handle) => {
        handle.point = Vec.toFixed(Vec.sub(handle.point, offset))
      })

      nextShape.point = Vec.toFixed(Vec.add(nextShape.point, offset))
    }

    return nextShape
  }
}
