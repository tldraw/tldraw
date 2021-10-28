import type { TLDrawShapeUtil } from './TLDrawShapeUtil'
import { RectangleUtil } from './rectangle'
import { EllipseUtil } from './ellipse'
import { ArrowUtil } from './arrow'
import { GroupUtil } from './group'
import { StickyUtil } from './sticky'
import { TextUtil } from './text'
import { DrawUtil } from './draw'
import { TLDrawShape, TLDrawShapeType } from '~types'

export * from './shape-styles'
export * from './TLDrawShapeUtil'

export const Rectangle = new RectangleUtil()
export const Ellipse = new EllipseUtil()
export const Draw = new DrawUtil()
export const Arrow = new ArrowUtil()
export const Text = new TextUtil()
export const Group = new GroupUtil()
export const Sticky = new StickyUtil()

// type Utils = RectangleUtil | EllipseUtil | DrawUtil | ArrowUtil | TextUtil | GroupUtil | StickyUtil

// type MappedByKey<U extends string | number, K extends string | number, T extends Record<K, U>> = {
//   [P in T[K]]: T extends any ? (P extends T[K] ? T : never) : never
// }

// export type ShapeUtilsMap = MappedByKey<Utils['type'], 'type', Utils>

// export const getShapeUtils = <T extends Utils['type']>(
//   type: T | Extract<TLDrawShape, { type: T }>
// ): ShapeUtilsMap[T] => {
//   if (typeof type === 'string') return shapeUtils[type]
//   return shapeUtils[type.type]
// }

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
