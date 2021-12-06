/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FullGestureState, WebKitGestureEvent } from '@use-gesture/core/types'
import type { KeyboardEvent } from 'react'
import type React from 'react'
import type {
  TLNuApp,
  TLNuInputs,
  TLNuSerializedApp,
  TLNuShape,
  TLNuShapeClass,
  TLNuToolClass,
  TLNuViewport,
} from '~nu-lib'

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
  | 'left'
  | 'right'
  | 'center'
  | 'background'

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
  | { type: TLNuTargetType.Canvas; target: 'canvas'; order: number }
  | { type: TLNuTargetType.Shape; target: S; order: number }
  | { type: TLNuTargetType.Bounds; target: TLNuBoundsHandle; order: number }

export type TLNuWheelHandler<
  S extends TLNuShape = TLNuShape,
  E extends TLNuEventInfo = TLNuEventInfo<S>
> = (
  info: E,
  gesture: Omit<FullGestureState<'wheel'>, 'event'> & {
    event: WheelEvent
  },
  event: WheelEvent
) => void

export interface TLNuPointerEvent<T = Element> extends TLNuReactPointerEvent<T> {
  order?: number
}

interface TLNuReactPointerEvent<T = Element> extends React.MouseEvent<T, PointerEvent> {
  pointerId: number
  pressure: number
  tangentialPressure: number
  tiltX: number
  tiltY: number
  twist: number
  width: number
  height: number
  pointerType: 'mouse' | 'pen' | 'touch'
  isPrimary: boolean
}

export type TLNuPointerEventHandler<T = Element> = React.EventHandler<TLNuPointerEvent<T>>

export type TLNuPointerHandler<
  S extends TLNuShape = TLNuShape,
  E extends TLNuEventInfo = TLNuEventInfo<S>
> = (info: E, event: TLNuPointerEvent | KeyboardEvent | WheelEvent) => void

export type TLNuKeyboardHandler<
  S extends TLNuShape = TLNuShape,
  E extends TLNuEventInfo = TLNuEventInfo<S>
> = (info: E, event: React.KeyboardEvent) => void

export type TLNuPinchHandler<
  S extends TLNuShape = TLNuShape,
  E extends TLNuEventInfo = TLNuEventInfo<S>
> = (
  info: E,
  gesture: Omit<FullGestureState<'pinch'>, 'event'> & {
    event: WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent
  },
  event: WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent
) => void

export interface TLNuCallbacks<
  S extends TLNuShape = TLNuShape,
  E extends TLNuEventInfo = TLNuEventInfo<S>
> {
  onKeyDown: TLNuKeyboardHandler<S, E>
  onKeyUp: TLNuKeyboardHandler<S, E>
  onPinch: TLNuPinchHandler<S, E>
  onPinchEnd: TLNuPinchHandler<S, E>
  onPinchStart: TLNuPinchHandler<S, E>
  onPointerDown: TLNuPointerHandler<S, E>
  onPointerEnter: TLNuPointerHandler<S, E>
  onPointerLeave: TLNuPointerHandler<S, E>
  onPointerMove: TLNuPointerHandler<S, E>
  onPointerUp: TLNuPointerHandler<S, E>
  onWheel: TLNuWheelHandler<S, E>
}

export type TLNuBoundsComponentProps<S extends TLNuShape = TLNuShape> = {
  zoom: number
  shapes: S[]
  bounds: TLNuBounds
  showResizeHandles: boolean
  showRotateHandle: boolean
}

export type TLNuBoundsComponent<S extends TLNuShape = TLNuShape> = (
  props: TLNuBoundsComponentProps<S>
) => JSX.Element | null

export interface TLNuOffset {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

export type TLNuContextBarComponent<S extends TLNuShape = TLNuShape> = (props: {
  shapes: S[]
  bounds: TLNuBounds
  scaledBounds: TLNuBounds
  rotation: number
  offset: TLNuOffset
}) => JSX.Element | null

export type TLNuBoundsDetailComponent = (props: {
  bounds: TLNuBounds
  scaledBounds: TLNuBounds
  zoom: number
  detail: 'size' | 'rotation'
}) => JSX.Element | null

export type TLNuComponents<S extends TLNuShape = TLNuShape> = Partial<{
  BoundsBackground: TLNuBoundsComponent<S> | null
  BoundsForeground: TLNuBoundsComponent<S> | null
  BoundsDetail: TLNuBoundsDetailComponent | null
  ContextBar: TLNuContextBarComponent<S> | null
}>

export type TLNuOnEnter<T extends { fromId: string }> = (info: T) => void
export type TLNuOnExit<T extends { toId: string }> = (info: T) => void

export type TLNuSubscriptionEvent =
  | {
      event: 'mount'
      info: null
    }
  | {
      event: 'persist'
      info: null
    }

export type TLNuSubscriptionEventName = TLNuSubscriptionEvent['event']

export type TLNuSubscriptionEventInfo<T extends TLNuSubscriptionEventName> = Extract<
  TLNuSubscriptionEvent,
  { event: T }
>['info']

export type TLNuSubscriptionCallback<
  E extends TLNuSubscriptionEventName,
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
> = (app: TLNuApp<S, B>, info: TLNuSubscriptionEventInfo<E>) => void

export type TLNuSubscription<
  E extends TLNuSubscriptionEventName,
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
> = {
  event: E
  callback: TLNuSubscriptionCallback<E, S, B>
}

export type TLSubscribe = {
  <
    E extends TLNuSubscriptionEventName,
    S extends TLNuShape = TLNuShape,
    B extends TLNuBinding = TLNuBinding
  >(
    subscription: TLNuSubscription<E, S, B>
  ): () => void
  <
    E extends TLNuSubscriptionEventName,
    S extends TLNuShape = TLNuShape,
    B extends TLNuBinding = TLNuBinding
  >(
    event: E,
    callback: TLNuSubscriptionCallback<E, S, B>
  ): () => void
}

export function isStringArray(arr: string[] | any[]): asserts arr is string[] {
  if (arr[0] && typeof arr[0] !== 'string') {
    throw Error('Expected a string array.')
  }
}

export interface TLNuViewOptions {
  showBounds?: boolean
  showResizeHandles?: boolean
  showRotateHandle?: boolean
  showContextMenu?: boolean
  showBoundsDetail?: boolean
  showBoundsRotation?: boolean
}

export interface TLNuContextProviderProps<S extends TLNuShape> extends TLNuCallbacks<S> {
  children?: React.ReactNode
  components?: Partial<TLNuComponents<S>>
  id?: string
  inputs: TLNuInputs
  theme?: TLNuTheme
  viewport: TLNuViewport
  meta?: any
}

export interface TLNuRendererProps<S extends TLNuShape, B extends TLNuBinding>
  extends TLNuViewOptions {
  bindings?: B[]
  brush?: TLNuBounds
  children?: React.ReactNode
  hoveredShape?: S
  editingShape?: S
  bindingShape?: S
  id?: string
  selectedBounds?: TLNuBounds
  selectedShapes?: S[]
  shapes?: S[]
  theme?: TLNuTheme
}

export interface TLNuSubscriptionCallbacks<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
> {
  onMount: TLNuSubscriptionCallback<'mount', S, B>
  onPersist: TLNuSubscriptionCallback<'persist', S, B>
}

export type TLNuAppProps<S extends TLNuShape = TLNuShape, B extends TLNuBinding = TLNuBinding> = {
  id?: string
  meta?: Record<string, unknown>
  theme?: Partial<TLNuTheme>
  components?: Partial<TLNuComponents<S>>
  children?: React.ReactNode
} & TLNuViewOptions &
  Partial<TLNuSubscriptionCallbacks<S, B>> &
  Partial<TLNuCallbacks<S>> &
  (
    | {
        serializedApp?: TLNuSerializedApp
        shapeClasses?: TLNuShapeClass<S>[]
        toolClasses?: TLNuToolClass<S, B>[]
      }
    | { app: TLNuApp<S, B> }
  )

export type AnyObject = { [key: string]: any }
