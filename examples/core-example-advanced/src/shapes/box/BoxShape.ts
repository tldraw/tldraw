import type { TLShape } from '@tldraw/core'

export interface BoxShape extends TLShape {
  type: 'box'
  size: number[]
}
