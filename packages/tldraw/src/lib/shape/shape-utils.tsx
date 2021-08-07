import { Rectangle, Ellipse, Arrow, Draw, Text } from './shapes'
import { TLDrawShape, TLDrawShapeUtil, TLDrawShapeUtils } from './shape-types'

export const tldrawShapeUtils: TLDrawShapeUtils = {
  rectangle: new Rectangle(),
  ellipse: new Ellipse(),
  draw: new Draw(),
  arrow: new Arrow(),
  text: new Text(),
}

export type ShapeByType<T extends keyof TLDrawShapeUtils> = TLDrawShapeUtils[T]

export function getShapeUtils<T extends TLDrawShape>(shape: T): TLDrawShapeUtil<T> {
  return tldrawShapeUtils[shape.type as T['type']] as TLDrawShapeUtil<T>
}

export function createShape<TLDrawShape>(type: string, props: Partial<TLDrawShape>) {
  return tldrawShapeUtils[type].create(props)
}
