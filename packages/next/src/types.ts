import Vec from '@tldraw/vec'

export enum TLNuBoundsEdge {
  Top = 'top_edge',
  Right = 'right_edge',
  Bottom = 'bottom_edge',
  Left = 'left_edge',
}

export enum TLNuBoundsCorner {
  TopLeft = 'top_left_corner',
  TopRight = 'top_right_corner',
  BottomRight = 'bottom_right_corner',
  BottomLeft = 'bottom_left_corner',
}

export type TLNuBoundsHandle =
  | TLNuBoundsCorner
  | TLNuBoundsEdge
  | 'rotate'
  | 'center'
  | 'left'
  | 'right'

export interface TLNuBoundsWithCenter extends TLNuBounds {
  midX: number
  midY: number
}

export enum TLNuSnapPoints {
  minX = 'minX',
  midX = 'midX',
  maxX = 'maxX',
  minY = 'minY',
  midY = 'midY',
  maxY = 'maxY',
}

export type TLNuSnap =
  | { id: TLNuSnapPoints; isSnapped: false }
  | {
      id: TLNuSnapPoints
      isSnapped: true
      to: number
      B: TLNuBoundsWithCenter
      distance: number
    }

export interface TLNuTheme {
  accent?: string
  brushFill?: string
  brushStroke?: string
  selectFill?: string
  selectStroke?: string
  background?: string
  foreground?: string
  grid?: string
}

export interface TLNuHandle {
  id: string
  index: number
  point: number[]
}

export interface TLNuBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  rotation?: number
}

export interface TLNuBinding {
  id: string
  toId: string
  fromId: string
}

export interface TLNuCallbacks {
  onPan?: (delta: number[]) => void
}
