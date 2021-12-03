/* eslint-disable @typescript-eslint/no-explicit-any */
import { TLNuBoundsCorner, TLNuBoundsEdge } from '~types'

export const PI = Math.PI
export const TAU = PI / 2
export const PI2 = PI * 2
export const EPSILON = Math.PI / 180

export const EMPTY_OBJECT: any = {}
export const EMPTY_ARRAY: any[] = []

export const CURSORS = {
  canvas: 'default',
  grab: 'grab',
  grabbing: 'grabbing',
  [TLNuBoundsCorner.TopLeft]: 'resize-nwse',
  [TLNuBoundsCorner.TopRight]: 'resize-nesw',
  [TLNuBoundsCorner.BottomRight]: 'resize-nwse',
  [TLNuBoundsCorner.BottomLeft]: 'resize-nesw',
  [TLNuBoundsEdge.Top]: 'resize-ns',
  [TLNuBoundsEdge.Right]: 'resize-ew',
  [TLNuBoundsEdge.Bottom]: 'resize-ns',
  [TLNuBoundsEdge.Left]: 'resize-ew',
}
