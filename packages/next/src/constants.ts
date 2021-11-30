import { TLNuBoundsCorner, TLNuBoundsEdge } from '~types'

export const CURSORS = {
  [TLNuBoundsCorner.TopLeft]: 'resize-nwse',
  [TLNuBoundsCorner.TopRight]: 'resize-nesw',
  [TLNuBoundsCorner.BottomRight]: 'resize-nwse',
  [TLNuBoundsCorner.BottomLeft]: 'resize-nesw',
  [TLNuBoundsEdge.Top]: 'resize-ns',
  [TLNuBoundsEdge.Right]: 'resize-ew',
  [TLNuBoundsEdge.Bottom]: 'resize-ns',
  [TLNuBoundsEdge.Left]: 'resize-ew',
}
