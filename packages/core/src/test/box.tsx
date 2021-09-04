/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react'
import { TLShapeUtil, TLShape, TLBounds, TLRenderInfo, TLTransformInfo } from '+types'
import Utils, { Intersect } from '+utils'

export interface BoxShape extends TLShape {
  size: number[]
}

export class Box extends TLShapeUtil<BoxShape> {
  type = 'box'

  defaultProps = {
    id: 'example1',
    type: 'box',
    parentId: 'page',
    childIndex: 0,
    name: 'Example Shape',
    point: [0, 0],
    size: [100, 100],
    rotation: 0,
  }

  create(props: Partial<BoxShape>) {
    return { ...this.defaultProps, ...props }
  }

  render(shape: BoxShape, info: TLRenderInfo): JSX.Element {
    return <rect width={100} height={100} fill="none" stroke="black" />
  }

  renderIndicator(shape: BoxShape) {
    return <rect width={100} height={100} />
  }

  shouldRender(prev: BoxShape, next: BoxShape): boolean {
    return true
  }

  getBounds(shape: BoxShape): TLBounds {
    return Utils.getFromCache(this.boundsCache, shape, () => ({
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 100,
      height: 100,
    }))
  }

  getRotatedBounds(shape: BoxShape) {
    return Utils.getBoundsFromPoints(Utils.getRotatedCorners(this.getBounds(shape), shape.rotation))
  }

  getCenter(shape: BoxShape): number[] {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  hitTest(shape: BoxShape, point: number[]) {
    return Utils.pointInBounds(point, this.getBounds(shape))
  }

  hitTestBounds(shape: BoxShape, bounds: TLBounds) {
    const rotatedCorners = Utils.getRotatedCorners(this.getBounds(shape), shape.rotation)

    return (
      rotatedCorners.every((point) => Utils.pointInBounds(point, bounds)) ||
      Intersect.polyline.bounds(rotatedCorners, bounds).length > 0
    )
  }

  transform(shape: BoxShape, bounds: TLBounds, _info: TLTransformInfo<BoxShape>): BoxShape {
    return { ...shape, point: [bounds.minX, bounds.minY] }
  }

  transformSingle(shape: BoxShape, bounds: TLBounds, info: TLTransformInfo<BoxShape>): BoxShape {
    return this.transform(shape, bounds, info)
  }
}
