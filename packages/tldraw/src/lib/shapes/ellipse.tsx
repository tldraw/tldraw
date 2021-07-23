import { BaseShape, TLShape } from '@tldraw/core'

export interface EllipseShape extends TLShape {
  type: 'rectangle'
  radius: number[]
}

export class Ellipse extends BaseShape<EllipseShape> {
  type = 'rectangle'

  render(shape: EllipseShape) {
    const {
      radius: [rx, ry],
    } = shape
    return (
      <ellipse cx={rx} cy={ry} rx={rx} ry={ry} fill="none" stroke="black" />
    )
  }

  getBounds(shape: EllipseShape) {
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
  }
}

export const ellipse = new Ellipse()
