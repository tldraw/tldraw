import {
  TLShapeUtil,
  TLShape,
  Utils,
  TLTransformInfo,
  TLBounds,
} from '@tldraw/core'
import { EllipseShape } from './shape-types'

export class Ellipse extends TLShapeUtil<EllipseShape> {
  type = 'ellipse' as const

  defaultProps = {
    id: 'id',
    type: 'ellipse' as const,
    name: 'Ellipse',
    parentId: 'page',
    childIndex: 0,
    point: [0, 0],
    radius: [100, 100],
    rotation: 0,
  }

  render(shape: EllipseShape) {
    const {
      radius: [rx, ry],
    } = shape
    return (
      <ellipse cx={rx} cy={ry} rx={rx} ry={ry} fill="none" stroke="black" />
    )
  }

  getBounds(shape: EllipseShape) {
    return Utils.getFromCache(this.boundsCache, shape, () => {
      const {
        radius: [rx, ry],
      } = shape

      return {
        minX: 0,
        minY: 0,
        maxX: rx * 2,
        maxY: ry * 2,
        width: rx * 2,
        height: ry * 2,
      }
    })
  }

  getRotatedBounds(shape: EllipseShape) {
    return Utils.getBoundsFromPoints(
      Utils.getRotatedCorners(this.getBounds(shape), shape.rotation)
    )
  }

  getCenter(shape: EllipseShape): number[] {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  hitTest(shape: EllipseShape, point: number[]) {
    return Utils.pointInBounds(point, this.getBounds(shape))
  }

  hitTestBounds(shape: EllipseShape, bounds: TLBounds) {
    const rotatedCorners = Utils.getRotatedCorners(
      this.getBounds(shape),
      shape.rotation
    )

    return (
      Utils.boundsContainPolygon(bounds, rotatedCorners) ||
      Utils.boundsCollidePolygon(bounds, rotatedCorners)
    )
  }

  transform(
    shape: TLShape,
    bounds: TLBounds,
    info: TLTransformInfo<EllipseShape>
  ) {
    shape.point = [bounds.minX, bounds.minY]
    return this
  }

  transformSingle(
    shape: TLShape,
    bounds: TLBounds,
    info: TLTransformInfo<EllipseShape>
  ) {
    return this.transform(shape, bounds, info)
  }
}

export const ellipse = new Ellipse()
