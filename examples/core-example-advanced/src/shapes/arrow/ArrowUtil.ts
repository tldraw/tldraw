import { TLBounds, Utils } from '@tldraw/core'
import { intersectBoundsLineSegment, intersectLineSegmentLineSegment } from '@tldraw/intersect'
import Vec from '@tldraw/vec'
import { nanoid } from 'nanoid'
import { CustomShapeUtil } from 'shapes/CustomShapeUtil'
import { ArrowComponent } from './ArrowComponent'
import { ArrowIndicator } from './ArrowIndicator'
import type { ArrowShape } from './ArrowShape'

type T = ArrowShape
type E = SVGSVGElement

export class ArrowUtil extends CustomShapeUtil<T, E> {
  Component = ArrowComponent

  Indicator = ArrowIndicator

  hideResizeHandles = true

  hideBounds = true

  getBounds = (shape: T) => {
    const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
      const { start, end } = shape.handles
      return Utils.getBoundsFromPoints([start.point, end.point])
    })

    return Utils.translateBounds(bounds, shape.point)
  }

  /* ----------------- Custom Methods ----------------- */

  canBind = false

  getShape = (props: Partial<T>): T => {
    return {
      id: nanoid(),
      type: 'arrow',
      name: 'arrow',
      parentId: 'page1',
      point: [0, 0],
      handles: {
        start: {
          id: 'start',
          index: 1,
          point: [0, 0],
        },
        end: {
          id: 'end',
          index: 2,
          point: [100, 100],
        },
      },
      childIndex: 1,
      ...props,
    }
  }

  shouldRender = (prev: T, next: T) => {
    return true
  }

  getCenter = (shape: T) => {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  hitTestPoint = (shape: T, point: number[]) => {
    const { start, end } = shape.handles
    return (
      Vec.distanceToLineSegment(
        Vec.add(shape.point, start.point),
        Vec.add(shape.point, end.point),
        point
      ) < 4
    )
  }

  hitTestLineSegment = (shape: T, A: number[], B: number[]) => {
    const { start, end } = shape.handles
    return intersectLineSegmentLineSegment(
      Vec.add(shape.point, start.point),
      Vec.add(shape.point, end.point),
      A,
      B
    ).didIntersect
  }

  hitTestBounds = (shape: T, bounds: TLBounds) => {
    const { start, end } = shape.handles
    return (
      Utils.boundsContain(bounds, this.getBounds(shape)) ||
      intersectBoundsLineSegment(
        Utils.translateBounds(bounds, Vec.neg(shape.point)),
        start.point,
        end.point
      ).length > 0
    )
  }

  transform = (shape: T, bounds: TLBounds, initialShape: T, scale: number[]) => {
    const { start, end } = initialShape.handles
    const initialBounds = this.getBounds(initialShape)
    const nStart = Vec.divV(start.point, [initialBounds.width, initialBounds.height])
    const nEnd = Vec.divV(end.point, [initialBounds.width, initialBounds.height])

    if (scale[0] < 0) {
      const t = nStart[0]
      nStart[0] = nEnd[0]
      nEnd[0] = t
    }

    if (scale[1] < 0) {
      const t = nStart[1]
      nStart[1] = nEnd[1]
      nEnd[1] = t
    }

    shape.point = [bounds.minX, bounds.minY]
    shape.handles.start.point = Vec.mulV([bounds.width, bounds.height], nStart)
    shape.handles.end.point = Vec.mulV([bounds.width, bounds.height], nEnd)
  }
}
