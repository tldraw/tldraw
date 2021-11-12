/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Utils, TLShapeUtil } from '@tldraw/core'
import type { TLPointerInfo, TLBounds } from '@tldraw/core'
import { intersectRayBounds } from '@tldraw/intersect'
import { Vec } from '@tldraw/vec'
import type { TLDrawBinding, TLDrawMeta, TLDrawShape, TLDrawTransformInfo } from '~types'
import * as React from 'react'

export abstract class TLDrawShapeUtil<
  T extends TLDrawShape,
  E extends Element = any
> extends TLShapeUtil<T, E, TLDrawMeta> {
  abstract type: T['type']

  canBind = false

  canEdit = false

  canClone = false

  isAspectRatioLocked = false

  hideResizeHandles = false

  abstract getShape: (props: Partial<T>) => T

  create = (props: { id: string } & Partial<T>) => {
    this.refMap.set(props.id, React.createRef())
    return this.getShape(props)
  }

  getCenter = (shape: T) => {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  getBindingPoint = <K extends TLDrawShape>(
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
  }

  mutate = (shape: T, props: Partial<T>): Partial<T> => {
    return props
  }

  transform = (shape: T, bounds: TLBounds, info: TLDrawTransformInfo<T>): Partial<T> => {
    return { ...shape, point: [bounds.minX, bounds.minY] }
  }

  transformSingle = (
    shape: T,
    bounds: TLBounds,
    info: TLDrawTransformInfo<T>
  ): Partial<T> | void => {
    return this.transform(shape, bounds, info)
  }

  updateChildren?: <K extends TLDrawShape>(shape: T, children: K[]) => Partial<K>[] | void

  onChildrenChange?: (shape: T, children: TLDrawShape[]) => Partial<T> | void

  onBindingChange?: (
    shape: T,
    binding: TLDrawBinding,
    target: TLDrawShape,
    targetBounds: TLBounds,
    center: number[]
  ) => Partial<T> | void

  onHandleChange?: (
    shape: T,
    handles: Partial<T['handles']>,
    info: Partial<TLPointerInfo>
  ) => Partial<T> | void

  onRightPointHandle?: (
    shape: T,
    handles: Partial<T['handles']>,
    info: Partial<TLPointerInfo>
  ) => Partial<T> | void

  onDoubleClickHandle?: (
    shape: T,
    handles: Partial<T['handles']>,
    info: Partial<TLPointerInfo>
  ) => Partial<T> | void

  onDoubleClickBoundsHandle?: (shape: T) => Partial<T> | void

  onSessionComplete?: (shape: T) => Partial<T> | void
}
