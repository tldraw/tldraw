import type { TldrawShapeUtil } from './TldrawShapeUtil'
import { RectangleUtil } from './RectangleUtil'
import { EllipseUtil } from './EllipseUtil'
import { ArrowUtil } from './ArrowUtil'
import { GroupUtil } from './GroupUtil'
import { StickyUtil } from './StickyUtil'
import { TextUtil } from './TextUtil'
import { DrawUtil } from './DrawUtil'
import { TldrawShape, TldrawShapeType } from '~types'

export const Rectangle = new RectangleUtil()
export const Ellipse = new EllipseUtil()
export const Draw = new DrawUtil()
export const Arrow = new ArrowUtil()
export const Text = new TextUtil()
export const Group = new GroupUtil()
export const Sticky = new StickyUtil()

export const shapeUtils = {
  [TldrawShapeType.Rectangle]: Rectangle,
  [TldrawShapeType.Ellipse]: Ellipse,
  [TldrawShapeType.Draw]: Draw,
  [TldrawShapeType.Arrow]: Arrow,
  [TldrawShapeType.Text]: Text,
  [TldrawShapeType.Group]: Group,
  [TldrawShapeType.Sticky]: Sticky,
}

export const getShapeUtils = <T extends TldrawShape>(shape: T | T['type']) => {
  if (typeof shape === 'string') return shapeUtils[shape] as unknown as TldrawShapeUtil<T>
  return shapeUtils[shape.type] as unknown as TldrawShapeUtil<T>
}
