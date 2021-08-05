import { rectangle } from './shapes/rectangle'
import { ellipse } from './shapes/ellipse'
import { draw } from './shapes/draw'
import { TLDrawShape, TLDrawShapeUtil, TLDrawShapeUtils } from './shape-types'

export const tldrawShapeUtils: TLDrawShapeUtils = {
  rectangle,
  ellipse,
  draw,
}

export type ShapeByType<T extends keyof TLDrawShapeUtils> = TLDrawShapeUtils[T]

export function getShapeUtils<T extends TLDrawShape>(shape: T): TLDrawShapeUtil<T> {
  return tldrawShapeUtils[shape.type as T['type']] as TLDrawShapeUtil<T>
}

export function createShape<TLDrawShape>(type: string, props: Partial<TLDrawShape>) {
  return tldrawShapeUtils[type].create(props)
}
