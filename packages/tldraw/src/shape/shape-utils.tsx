/* eslint-disable @typescript-eslint/no-explicit-any */
import { Rectangle, Ellipse, Arrow, Draw, Text, Group, PostIt } from './shapes'
import { TLDrawShapeType, TLDrawShape, TLDrawShapeUtil } from '~types'

// This is a bad "any", but the "this" context stuff we're doing doesn't allow us to union the types
export const tldrawShapeUtils: Record<TLDrawShapeType, any> = {
  [TLDrawShapeType.Rectangle]: Rectangle,
  [TLDrawShapeType.Ellipse]: Ellipse,
  [TLDrawShapeType.Draw]: Draw,
  [TLDrawShapeType.Arrow]: Arrow,
  [TLDrawShapeType.Text]: Text,
  [TLDrawShapeType.Group]: Group,
  [TLDrawShapeType.PostIt]: PostIt,
}

export function getShapeUtils<T extends TLDrawShape>(type: T['type']) {
  return tldrawShapeUtils[type] as TLDrawShapeUtil<T>
}
