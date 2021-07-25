import {
  TLShapeUtil,
  TLBounds,
  TLShape,
  Utils,
  TLTransformInfo,
} from '@tldraw/core'

export interface RectangleShape extends TLShape {
  type: 'rectangle'
  size: number[]
}

export class Rectangle extends TLShapeUtil<RectangleShape> {
  type = 'rectangle' as const

  defaultProps = {
    id: 'id',
    type: 'rectangle' as const,
    name: 'Rectangle',
    parentId: 'page',
    childIndex: 0,
    point: [0, 0],
    size: [100, 100],
    rotation: 0,
  }

  render(shape: RectangleShape) {
    const { size } = shape
    return <rect width={size[0]} height={size[1]} fill="none" stroke="black" />
  }

  getBounds(shape: RectangleShape) {
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

  getRotatedBounds(shape: RectangleShape) {
    return Utils.getBoundsFromPoints(
      Utils.getRotatedCorners(this.getBounds(shape), shape.rotation)
    )
  }

  getCenter(shape: RectangleShape): number[] {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  hitTest(shape: RectangleShape, point: number[]) {
    return Utils.pointInBounds(point, this.getBounds(shape))
  }

  hitTestBounds(shape: RectangleShape, bounds: TLBounds) {
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
    info: TLTransformInfo<RectangleShape>
  ) {
    shape.point = [bounds.minX, bounds.minY]
    return this
  }

  transformSingle(
    shape: TLShape,
    bounds: TLBounds,
    info: TLTransformInfo<RectangleShape>
  ) {
    return this.transform(shape, bounds, info)
  }
}

export const rectangle = new Rectangle()
