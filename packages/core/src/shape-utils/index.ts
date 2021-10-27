import type { TLShape } from '+types'
import type { TLShapeUtil } from './TLShapeUtil'

export type TLShapeUtilsMap<T extends TLShape> = {
  [K in T['type']]: TLShapeUtil<T>
}

export type GetShapeUtils = <T extends TLShape>(type: T | T['type']) => TLShapeUtil<T>

export * from './TLShapeUtil'
