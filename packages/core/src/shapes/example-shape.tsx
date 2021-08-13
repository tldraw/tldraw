/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react'
import { TLShapeUtil, TLShape, TLBounds, TLRenderInfo, TLTransformInfo } from '~types'
import Utils, { Intersect } from '~utils'

export class ExampleShape extends TLShapeUtil<TLShape> {
  type = 'shape-type'

  defaultProps = {
    id: 'example',
    type: 'shape-type',
    parentId: 'page',
    childIndex: 0,
    name: 'Example Shape',
    point: [0, 0],
    rotation: 0,
  }

  create(props: Partial<TLShape>) {
    return { ...this.defaultProps, ...props }
  }

  render(shape: TLShape, info: TLRenderInfo): JSX.Element {
    return <rect width={100} height={100} fill="none" stroke="black" />
  }

  renderIndicator(shape: TLShape) {
    return <rect width={100} height={100} />
  }

  shouldRender(prev: TLShape, next: TLShape): boolean {
    return true
  }

  getBounds(shape: TLShape): TLBounds {
    return Utils.getFromCache(this.boundsCache, shape, () => ({
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 100,
      height: 100,
    }))
  }

  getRotatedBounds(shape: TLShape) {
    return Utils.getBoundsFromPoints(Utils.getRotatedCorners(this.getBounds(shape), shape.rotation))
  }

  getCenter(shape: TLShape): number[] {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  hitTest(shape: TLShape, point: number[]) {
    return Utils.pointInBounds(point, this.getBounds(shape))
  }

  hitTestBounds(shape: TLShape, bounds: TLBounds) {
    const rotatedCorners = Utils.getRotatedCorners(this.getBounds(shape), shape.rotation)

    return (
      rotatedCorners.every((point) => Utils.pointInBounds(point, bounds)) ||
      Intersect.polyline.bounds(rotatedCorners, bounds).length > 0
    )
  }

  transform(shape: TLShape, bounds: TLBounds, _info: TLTransformInfo<TLShape>): TLShape {
    return { ...shape, point: [bounds.minX, bounds.minY] }
  }

  transformSingle(shape: TLShape, bounds: TLBounds, info: TLTransformInfo<TLShape>): TLShape {
    return this.transform(shape, bounds, info)
  }
}
