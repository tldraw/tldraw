/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import Utils from '+utils'
import { intersectPolylineBounds } from '@tldraw/intersect'
import type { TLBounds, TLComponentProps, TLShape } from 'types'

export interface TLIndicator<T extends TLShape, E extends Element = any, M = any> {
  (
    this: TLShapeUtil<T, E, M>,
    props: { shape: T; meta: M; isHovered: boolean; isSelected: boolean }
  ): React.ReactElement | null
}

export abstract class TLShapeUtil<T extends TLShape, E extends Element = any, M = any> {
  refMap = new Map<string, React.RefObject<E>>()

  boundsCache = new WeakMap<TLShape, TLBounds>()

  canEdit = false

  canBind = false

  canClone = false

  showBounds = true

  isStateful = false

  isAspectRatioLocked = false

  abstract Component: React.ForwardRefExoticComponent<TLComponentProps<T, E, M>>

  abstract Indicator: TLIndicator<T, E, M>

  shouldRender: (prev: T, next: T) => boolean = () => true

  getRef = (shape: T): React.RefObject<E> => {
    if (!this.refMap.has(shape.id)) {
      this.refMap.set(shape.id, React.createRef<E>())
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.refMap.get(shape.id)!
  }

  hitTest = (shape: T, point: number[]): boolean => {
    const bounds = this.getBounds(shape)
    return shape.rotation
      ? Utils.pointInPolygon(point, Utils.getRotatedCorners(bounds, shape.rotation))
      : Utils.pointInBounds(point, bounds)
  }

  hitTestBounds = (shape: T, bounds: TLBounds) => {
    const shapeBounds = this.getBounds(shape)

    if (!shape.rotation) {
      return (
        Utils.boundsContain(bounds, shapeBounds) ||
        Utils.boundsContain(shapeBounds, bounds) ||
        Utils.boundsCollide(shapeBounds, bounds)
      )
    }

    const corners = Utils.getRotatedCorners(shapeBounds, shape.rotation)

    return (
      corners.every((point) => Utils.pointInBounds(point, bounds)) ||
      intersectPolylineBounds(corners, bounds).length > 0
    )
  }

  abstract getBounds: (shape: T) => TLBounds

  getRotatedBounds: (shape: T) => TLBounds = (shape) => {
    return Utils.getBoundsFromPoints(Utils.getRotatedCorners(this.getBounds(shape), shape.rotation))
  }
}
