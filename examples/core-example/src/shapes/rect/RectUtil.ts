import { TLBounds, TLShapeUtil } from '@tldraw/core'
import { RectComponent } from './RectComponent'
import { RectIndicator } from './RectIndicator'
import type { RectShape } from './RectShape'

type T = RectShape
type E = SVGSVGElement

export class RectUtil extends TLShapeUtil<T, E> {
  Component = RectComponent

  Indicator = RectIndicator

  getBounds = (shape: T) => {
    const [x, y] = shape.point
    const [width, height] = shape.size

    const bounds: TLBounds = {
      minX: x,
      maxX: x + width,
      minY: y,
      maxY: y + height,
      width,
      height,
    } as TLBounds

    return bounds
  }
}
