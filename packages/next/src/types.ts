import type { KeyboardEvent } from 'react'
import type React from 'react'
import type { TLNuShape } from '~nu-lib'

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

export enum TLNuTargetType {
  Canvas = 'canvas',
  Shape = 'shape',
  Bounds = 'bounds',
}

export type TLNuEventInfo<S extends TLNuShape = TLNuShape> =
  | { type: TLNuTargetType.Canvas; order: number }
  | { type: TLNuTargetType.Shape; target: S; order: number }
  | { type: TLNuTargetType.Bounds; target: TLNuBoundsHandle; order: number }

export type TLNuWheelHandler<
  S extends TLNuShape = TLNuShape,
  E extends TLNuEventInfo = TLNuEventInfo<S>
> = (info: E, event: WheelEvent) => void

export type TLNuPointerHandler<
  S extends TLNuShape = TLNuShape,
  E extends TLNuEventInfo = TLNuEventInfo<S>
> = (info: E, event: React.PointerEvent | KeyboardEvent | WheelEvent) => void

export type TLNuKeyboardHandler<
  S extends TLNuShape = TLNuShape,
  E extends TLNuEventInfo = TLNuEventInfo<S>
> = (info: E, event: React.KeyboardEvent) => void

export interface TLNuCallbacks<
  S extends TLNuShape = TLNuShape,
  E extends TLNuEventInfo = TLNuEventInfo<S>
> {
  onPan?: TLNuWheelHandler<S, E>
  onPointerDown?: TLNuPointerHandler<S, E>
  onPointerUp?: TLNuPointerHandler<S, E>
  onPointerMove?: TLNuPointerHandler<S, E>
  onPointerEnter?: TLNuPointerHandler<S, E>
  onPointerLeave?: TLNuPointerHandler<S, E>
  onKeyDown?: TLNuKeyboardHandler<S, E>
  onKeyUp?: TLNuKeyboardHandler<S, E>
}

export type TLNuBoundsComponentProps<S extends TLNuShape = TLNuShape> = {
  shapes: S[]
  bounds: TLNuBounds
}

export type TLNuBoundsComponent<S extends TLNuShape = TLNuShape> = (
  props: TLNuBoundsComponentProps<S>
) => JSX.Element

export type TLNuComponents<S extends TLNuShape = TLNuShape> = {
  boundsBackground: TLNuBoundsComponent<S>
  boundsForeground: TLNuBoundsComponent<S>
}
