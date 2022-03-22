import type { TLShape } from '@tlslides/core'

export interface BoxShape extends TLShape {
  type: 'box'
  size: number[]
}
