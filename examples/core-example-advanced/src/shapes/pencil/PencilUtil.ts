import { TLBounds, Utils } from '@tldraw/core'
import {
  intersectBoundsBounds,
  intersectBoundsPolyline,
  intersectLineSegmentPolyline,
} from '@tldraw/intersect'
import Vec from '@tldraw/vec'
import { nanoid } from 'nanoid'
import { CustomShapeUtil } from 'shapes/CustomShapeUtil'
import { PencilComponent } from './PencilComponent'
import type { PencilShape } from './PencilShape'
import { PencilIndicator } from './PenclIndicator'

type T = PencilShape
type E = SVGSVGElement

export class PencilUtil extends CustomShapeUtil<T, E> {
  Component = PencilComponent

  Indicator = PencilIndicator

  hideResizeHandles = true

  hideBounds = false

  getBounds = (shape: T) => {
    const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
      return Utils.getBoundsFromPoints(shape.points)
    })

    return Utils.translateBounds(bounds, shape.point)
  }

  /* ----------------- Custom Methods ----------------- */

  canBind = false

  getShape = (props: Partial<T>): T => {
    return {
      id: nanoid(),
      type: 'pencil',
      name: 'Pencil',
      parentId: 'page1',
      point: [0, 0],
      points: [[0, 0]],
      childIndex: 1,
      ...props,
    }
  }

  shouldRender = (prev: T, next: T): boolean => {
    return prev.points !== next.points
  }

  getCenter = (shape: T) => {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  hitTestPoint = (shape: T, point: number[]) => {
    const ptA = Vec.sub(point, shape.point)
    return Utils.pointInPolyline(ptA, shape.points)
  }

  hitTestLineSegment = (shape: T, A: number[], B: number[]) => {
    const ptA = Vec.sub(A, shape.point)
    const ptB = Vec.sub(B, shape.point)
    return intersectLineSegmentPolyline(ptA, ptB, shape.points).didIntersect
  }

  hitTestBounds = (shape: T, bounds: TLBounds) => {
    const shapeBounds = this.getBounds(shape)
    return (
      Utils.boundsContain(bounds, shapeBounds) ||
      (intersectBoundsBounds(bounds, shapeBounds) &&
        intersectBoundsPolyline(Utils.translateBounds(bounds, Vec.neg(shape.point)), shape.points)
          .length > 0)
    )
  }

  transform = (shape: T, bounds: TLBounds, initialShape: T, scale: number[]) => {
    shape.point = [bounds.minX, bounds.minY]
    // shape.size = [bounds.width, bounds.height]
  }
}
