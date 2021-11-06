import type { TLDrawShapeUtil } from './TLDrawShapeUtil'
import { RectangleUtil } from './RectangleUtil'
import { EllipseUtil } from './EllipseUtil'
import { ArrowUtil } from './ArrowUtil'
import { GroupUtil } from './GroupUtil'
import { StickyUtil } from './StickyUtil'
import { TextUtil } from './TextUtil'
import { DrawUtil } from './DrawUtil'
import { TLDrawShape, TLDrawShapeType } from '~types'

export const Rectangle = new RectangleUtil()
export const Ellipse = new EllipseUtil()
export const Draw = new DrawUtil()
export const Arrow = new ArrowUtil()
export const Text = new TextUtil()
export const Group = new GroupUtil()
export const Sticky = new StickyUtil()

export const shapeUtils = {
  [TLDrawShapeType.Rectangle]: Rectangle,
  [TLDrawShapeType.Ellipse]: Ellipse,
  [TLDrawShapeType.Draw]: Draw,
  [TLDrawShapeType.Arrow]: Arrow,
  [TLDrawShapeType.Text]: Text,
  [TLDrawShapeType.Group]: Group,
  [TLDrawShapeType.Sticky]: Sticky,
}

export const getShapeUtils = <T extends TLDrawShape>(shape: T | T['type']) => {
  if (typeof shape === 'string') return shapeUtils[shape] as unknown as TLDrawShapeUtil<T>
  return shapeUtils[shape.type] as unknown as TLDrawShapeUtil<T>
}
