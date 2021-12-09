import type { TDShapeUtil } from './TDShapeUtil'
import { RectangleUtil } from './RectangleUtil'
import { TriangleUtil } from './TriangleUtil'
import { EllipseUtil } from './EllipseUtil'
import { ArrowUtil } from './ArrowUtil'
import { GroupUtil } from './GroupUtil'
import { StickyUtil } from './StickyUtil'
import { TextUtil } from './TextUtil'
import { DrawUtil } from './DrawUtil'
import { TDShape, TDShapeType } from '~types'

export const Rectangle = new RectangleUtil()
export const Triangle = new TriangleUtil()
export const Ellipse = new EllipseUtil()
export const Draw = new DrawUtil()
export const Arrow = new ArrowUtil()
export const Text = new TextUtil()
export const Group = new GroupUtil()
export const Sticky = new StickyUtil()

export const shapeUtils = {
  [TDShapeType.Rectangle]: Rectangle,
  [TDShapeType.Triangle]: Triangle,
  [TDShapeType.Ellipse]: Ellipse,
  [TDShapeType.Draw]: Draw,
  [TDShapeType.Arrow]: Arrow,
  [TDShapeType.Text]: Text,
  [TDShapeType.Group]: Group,
  [TDShapeType.Sticky]: Sticky,
}

export const getShapeUtil = <T extends TDShape>(shape: T | T['type']) => {
  if (typeof shape === 'string') return shapeUtils[shape] as unknown as TDShapeUtil<T>
  return shapeUtils[shape.type] as unknown as TDShapeUtil<T>
}
