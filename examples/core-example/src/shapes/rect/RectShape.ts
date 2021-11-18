import type { TLShape } from '@tldraw/core'

export interface RectShape extends TLShape {
  type: 'box'
  size: number[]
}
