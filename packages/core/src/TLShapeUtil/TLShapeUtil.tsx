import { intersectPolygonBounds } from '@tldraw/intersect'
import * as React from 'react'
import type { TLBounds, TLComponentProps, TLForwardedRef, TLShape, TLUser } from '~types'
import Utils from '~utils'

export abstract class TLShapeUtil<T extends TLShape, E extends Element = any, M = any> {
  refMap = new Map<string, React.RefObject<E>>()

  boundsCache = new WeakMap<TLShape, TLBounds>()

  showCloneHandles = false

  hideBounds = false

  isStateful = false

  abstract Component: React.ForwardRefExoticComponent<TLComponentProps<T, E, M>>

  abstract Indicator: (props: {
    shape: T
    meta: M
    user?: TLUser<T>
    bounds: TLBounds
    isHovered: boolean
    isSelected: boolean
  }) => React.ReactElement | null

  abstract getBounds: (shape: T) => TLBounds

  shouldRender = (prev: T, next: T): boolean => true

  getRef = (shape: T): React.RefObject<E> => {
    if (!this.refMap.has(shape.id)) {
      this.refMap.set(shape.id, React.createRef<E>())
    }
    return this.refMap.get(shape.id)!
  }

  hitTestBounds = (shape: T, bounds: TLBounds) => {
    const shapeBounds = this.getBounds(shape)
    const corners = Utils.getRotatedCorners(shapeBounds, shape.rotation)
    return (
      corners.every((point) => Utils.pointInBounds(point, bounds)) ||
      intersectPolygonBounds(corners, bounds).length > 0
    )
  }

  getRotatedBounds: (shape: T) => TLBounds = (shape) => {
    return Utils.getBoundsFromPoints(Utils.getRotatedCorners(this.getBounds(shape), shape.rotation))
  }

  /* --------------------- Static --------------------- */

  static Component = <T extends TLShape, E extends Element = any, M = any>(
    component: (props: TLComponentProps<T, E, M>, ref: TLForwardedRef<E>) => React.ReactElement
  ) => {
    return React.forwardRef(component)
  }

  static Indicator = <T extends TLShape, M = any>(
    component: (props: {
      shape: T
      meta: M
      isHovered: boolean
      isSelected: boolean
      bounds: TLBounds
    }) => React.ReactElement
  ) => component
}
