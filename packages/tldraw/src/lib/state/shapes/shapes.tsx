import { rectangle, RectangleShape } from './rectangle'
import { ellipse, EllipseShape } from './ellipse'
import { TLShapeUtil, TLShapeUtils } from '@tldraw/core'

export type TLDrawShape = RectangleShape | EllipseShape

export type TLDrawShapeUtils = TLShapeUtils<TLDrawShape>

export type ShapeType = TLDrawShape['type']

export const tldrawShapeUtils: TLDrawShapeUtils = {
  rectangle,
  ellipse,
}

export function getShapeUtils<T extends TLDrawShape>(shape: T): TLShapeUtil<T> {
  return tldrawShapeUtils[shape.type as T['type']] as TLShapeUtil<T>
}
