/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Utils, TLShapeUtil } from '@tldraw/core'
import type { TLPointerInfo, TLBounds } from '@tldraw/core'
import {
  intersectLineSegmentBounds,
  intersectLineSegmentPolyline,
  intersectRayBounds,
} from '@tldraw/intersect'
import { Vec } from '@tldraw/vec'
import type { TDBinding, TDMeta, TDShape, TransformInfo } from '~types'
import * as React from 'react'
import { BINDING_DISTANCE } from '~constants'

export abstract class TDShapeUtil<T extends TDShape, E extends Element = any> extends TLShapeUtil<
  T,
  E,
  TDMeta
> {
  abstract type: T['type']

  canBind = false

  canEdit = false

  canClone = false

  isAspectRatioLocked = false

  hideResizeHandles = false

  bindingDistance = BINDING_DISTANCE

  abstract getShape: (props: Partial<T>) => T

  hitTestPoint = (shape: T, point: number[]): boolean => {
    return Utils.pointInBounds(point, this.getRotatedBounds(shape))
  }

  hitTestLineSegment = (shape: T, A: number[], B: number[]): boolean => {
    const box = Utils.getBoundsFromPoints([A, B])
    const bounds = this.getBounds(shape)

    return Utils.boundsContain(bounds, box) || shape.rotation
      ? intersectLineSegmentPolyline(A, B, Utils.getRotatedCorners(this.getBounds(shape)))
          .didIntersect
      : intersectLineSegmentBounds(A, B, this.getBounds(shape)).length > 0
  }

  create = (props: { id: string } & Partial<T>) => {
    this.refMap.set(props.id, React.createRef())
    return this.getShape(props)
  }

  getCenter = (shape: T) => {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  getExpandedBounds = (shape: T) => {
    return Utils.expandBounds(this.getBounds(shape), this.bindingDistance)
  }

  hitTestBindingPoint = (shape: T, point: number[]): boolean => {
    const expandedBounds = this.getExpandedBounds(shape)
    return Utils.pointInBounds(point, expandedBounds)
  }

  getBindingInfo = <K extends TDShape>(
    shape: T,
    point: number[],
    bindAnywhere: boolean
  ): { point: number[]; isInside: boolean; isExact: boolean } | undefined => {
    // We need to find the binding point: a normalized point
    // within the expanded bounds of the shape where the arrow will point to.
    if (!this.hitTestBindingPoint(shape, point)) return
    const expandedBounds = this.getExpandedBounds(shape)
    return {
      isInside: Utils.pointInBounds(point, this.getBounds(shape)),
      isExact: bindAnywhere,
      point: Vec.clampV(
        Vec.divV(Vec.sub(point, [expandedBounds.minX, expandedBounds.minY]), [
          expandedBounds.width,
          expandedBounds.height,
        ]),
        0,
        1
      ),
    }
  }

  mutate = (shape: T, props: Partial<T>): Partial<T> => {
    return props
  }

  transform = (shape: T, bounds: TLBounds, info: TransformInfo<T>): Partial<T> => {
    return { ...shape, point: [bounds.minX, bounds.minY] }
  }

  transformSingle = (shape: T, bounds: TLBounds, info: TransformInfo<T>): Partial<T> | void => {
    return this.transform(shape, bounds, info)
  }

  updateChildren?: <K extends TDShape>(shape: T, children: K[]) => Partial<K>[] | void

  onChildrenChange?: (shape: T, children: TDShape[]) => Partial<T> | void

  onBindingChange?: (
    shape: T,
    handleId: 'start' | 'end',
    startInfo?: { binding: TDBinding; target: TDShape; bounds: TLBounds },
    endInfo?: { binding: TDBinding; target: TDShape; bounds: TLBounds }
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

  getSvgElement = (shape: T): SVGElement | void => {
    return document.getElementById(shape.id + '_svg')?.cloneNode(true) as SVGElement
  }
}
