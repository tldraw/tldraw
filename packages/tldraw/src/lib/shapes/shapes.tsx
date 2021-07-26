import { rectangle } from './rectangle'
import { ellipse } from './ellipse'
import { TLShapeUtil } from '@tldraw/core'
import { TLDrawShape, TLDrawShapeUtils } from './shape-types'

export const tldrawShapeUtils: TLDrawShapeUtils = {
  rectangle,
  ellipse,
}

export type ShapeByType<T extends keyof TLDrawShapeUtils> = TLDrawShapeUtils[T]

export function getShapeUtils<T extends TLDrawShape>(shape: T): TLShapeUtil<T> {
  return tldrawShapeUtils[shape.type as T['type']] as TLShapeUtil<T>
}

export function createShape<TLDrawShape>(type: string, props: Partial<TLDrawShape>) {
  return tldrawShapeUtils[type].create(props)
}
