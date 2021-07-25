import { rectangle } from './rectangle'
import { ellipse } from './ellipse'
import { TLShapeUtil } from '@tldraw/core'
import { TLDrawShape, TLDrawShapeUtils } from './shape-types'

export const tldrawShapeUtils: TLDrawShapeUtils = {
  rectangle,
  ellipse,
}

export function getShapeUtils<T extends TLDrawShape>(shape: T): TLShapeUtil<T> {
  return tldrawShapeUtils[shape.type as T['type']] as TLShapeUtil<T>
}
