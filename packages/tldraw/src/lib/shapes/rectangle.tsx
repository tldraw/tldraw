import { BaseShape, Bounds, TLShape, Utils } from '@tldraw/core'

export interface RectangleShape extends TLShape {
  type: 'rectangle'
  size: number[]
}

export class Rectangle extends BaseShape<RectangleShape> {
  type = 'rectangle'

  boundsCache = new WeakMap<RectangleShape, Bounds>([])

  render(shape: RectangleShape) {
    const { size } = shape
    return <rect width={size[0]} height={size[1]} fill="none" stroke="black" />
  }

  getBounds(shape: RectangleShape) {
    const bounds = Utils.getFromCache(this.boundsCache, shape, (cache) => {
      const [width, height] = shape.size
      cache.set(shape, {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        width,
        height,
      })
    })

    return Utils.translateBounds(bounds, shape.point)
  }
}

export const rectangle = new Rectangle()
