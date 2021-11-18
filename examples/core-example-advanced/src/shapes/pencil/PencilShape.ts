import type { TLShape } from '@tldraw/core'

export interface PencilShape extends TLShape {
  type: 'pencil'
  points: number[][]
}
