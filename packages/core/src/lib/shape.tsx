import { TLShape, Bounds, TLRenderInfo } from './types'

export class BaseShape<T extends TLShape> {
  type = 'shape-id'

  render(shape: T, info: TLRenderInfo): JSX.Element {
    return <rect width={100} height={100} fill="none" stroke="black" />
  }

  shouldRender(prev: T, next: T): boolean {
    return true
  }

  getBounds(shape: T): Bounds {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 100,
      height: 100,
    }
  }

  getCenter(shape: T): number[] {
    const bounds = this.getBounds(shape)
    return [bounds.width / 2, bounds.height / 2]
  }
}
