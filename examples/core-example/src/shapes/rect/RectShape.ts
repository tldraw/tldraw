import type { TLShape } from '@tlslides/core'

export interface RectShape extends TLShape {
  type: 'rect'
  size: number[]
}
