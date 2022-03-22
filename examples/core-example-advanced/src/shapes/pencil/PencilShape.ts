import type { TLShape } from '@tlslides/core'

export interface PencilShape extends TLShape {
  type: 'pencil'
  points: number[][]
}
