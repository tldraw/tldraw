/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { Vec } from '@tldraw/vec'
import type { TLShape, TLShapeUtil } from '+types'
import Utils from '+utils'
import { intersectPolylineBounds, intersectRayBounds } from '@tldraw/intersect'

export const ShapeUtil = function <T extends TLShape, E extends Element, M = any, K = unknown>(
  this: TLShapeUtil<T, E, M> & K,
  fn: (
    this: TLShapeUtil<T, E, M> & K
  ) => Partial<TLShapeUtil<T, E, M>> &
    Pick<TLShapeUtil<T, E, M>, 'type' | 'defaultProps' | 'Component' | 'Indicator' | 'getBounds'> &
    K
): TLShapeUtil<T, E, M> & ReturnType<typeof fn> {
  const defaults: Partial<TLShapeUtil<T, E, M>> = {
    refMap: new Map(),

    boundsCache: new WeakMap(),

    canEdit: false,

    canBind: false,

    isAspectRatioLocked: false,

    MiniShape: ({ bounds }) => {
      return (
        <rect
          fill="rgba(0,0,0,.2)"
          stroke="rgba(0,0,0,.5)"
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
        />
      )
    },

    create: (props) => {
      this.refMap.set(props.id, React.createRef())
      const defaults = this.defaultProps
      return { ...defaults, ...props }
    },

    getRef: (shape) => {
      if (!this.refMap.has(shape.id)) {
        this.refMap.set(shape.id, React.createRef<E>())
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.refMap.get(shape.id)!
    },

    mutate: (shape, props) => {
      return { ...shape, ...props }
    },

    transform: (shape, bounds) => {
      return { ...shape, point: [bounds.minX, bounds.minY] }
    },

    transformSingle: (shape, bounds, info) => {
      return this.transform(shape, bounds, info)
    },

    shouldRender: () => {
      return true
    },

    getRotatedBounds: (shape) => {
      return Utils.getBoundsFromPoints(
        Utils.getRotatedCorners(this.getBounds(shape), shape.rotation)
      )
    },

    getCenter: (shape) => {
      return Utils.getBoundsCenter(this.getBounds(shape))
    },

    hitTest: (shape, point) => {
      return Utils.pointInBounds(point, this.getBounds(shape))
    },

    hitTestBounds: (shape, bounds) => {
      const { minX, minY, maxX, maxY, width, height } = this.getBounds(shape)
      const center = [minX + width / 2, minY + height / 2]

      const corners = [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
      ].map((point) => Vec.rotWith(point, center, shape.rotation || 0))

      return (
        corners.every(
          (point) =>
            !(
              point[0] < bounds.minX ||
              point[0] > bounds.maxX ||
              point[1] < bounds.minY ||
              point[1] > bounds.maxY
            )
        ) || intersectPolylineBounds(corners, bounds).length > 0
      )
    },

    getBindingPoint: (shape, fromShape, point, origin, direction, padding, bindAnywhere) => {
      // Algorithm time! We need to find the binding point (a normalized point inside of the shape, or around the shape, where the arrow will point to) and the distance from the binding shape to the anchor.

      let bindingPoint: number[]

      let distance: number

      const bounds = this.getBounds(shape)

      const expandedBounds = Utils.expandBounds(bounds, padding)

      // The point must be inside of the expanded bounding box
      if (!Utils.pointInBounds(point, expandedBounds)) return

      // The point is inside of the shape, so we'll assume the user is indicating a specific point inside of the shape.
      if (bindAnywhere) {
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
        // (1) Binding point

        // Find furthest intersection between ray from origin through point and expanded bounds. TODO: What if the shape has a curve? In that case, should we intersect the circle-from-three-points instead?

        const intersection = intersectRayBounds(origin, direction, expandedBounds)
          .filter((int) => int.didIntersect)
          .map((int) => int.points[0])
          .sort((a, b) => Vec.dist(b, origin) - Vec.dist(a, origin))[0]

        // The anchor is a point between the handle and the intersection
        const anchor = Vec.med(point, intersection)

        // If we're close to the center, snap to the center, or else calculate a normalized point based on the anchor and the expanded bounds.

        if (Vec.distanceToLineSegment(point, anchor, this.getCenter(shape)) < 12) {
          bindingPoint = [0.5, 0.5]
        } else {
          //
          bindingPoint = Vec.divV(Vec.sub(anchor, [expandedBounds.minX, expandedBounds.minY]), [
            expandedBounds.width,
            expandedBounds.height,
          ])
        }

        // (3) Distance

        // If the point is inside of the bounds, set the distance to a fixed value.
        if (Utils.pointInBounds(point, bounds)) {
          distance = 16
        } else {
          // If the binding point was close to the shape's center, snap to to the center. Find the distance between the point and the real bounds of the shape
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
    },

    onDoubleClickBoundsHandle() {
      return
    },

    onDoubleClickHandle() {
      return
    },

    onHandleChange() {
      return
    },

    onRightPointHandle() {
      return
    },

    onSessionComplete() {
      return
    },

    onStyleChange() {
      return
    },

    onBindingChange() {
      return
    },

    onChildrenChange() {
      return
    },

    updateChildren() {
      return
    },
  }

  Object.assign(this, defaults)
  Object.assign(this, fn.call(this))
  Object.assign(this, fn.call(this))

  // Make sure all functions are bound to this
  for (const entry of Object.entries(this)) {
    if (entry[1] instanceof Function) {
      this[entry[0] as keyof typeof this] = this[entry[0]].bind(this)
    }
  }

  this._Component = React.forwardRef(this.Component)

  return this
} as unknown as {
  new <T extends TLShape, E extends Element, M = any, K = unknown>(
    fn: (
      this: TLShapeUtil<T, E, M>
    ) => Partial<TLShapeUtil<T, E, M>> &
      Pick<
        TLShapeUtil<T, E, M>,
        'type' | 'defaultProps' | 'Component' | 'Indicator' | 'getBounds'
      > &
      K
  ): TLShapeUtil<T, E, M> & ReturnType<typeof fn>
}
