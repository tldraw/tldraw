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
  TLNuRootState,
  TLNuState,
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

export type TLNuEventInfo<S extends TLNuShape> =
  | { type: TLNuTargetType.Canvas; target: 'canvas'; order: number }
  | { type: TLNuTargetType.Shape; target: S; order: number }
  | {
      type: TLNuTargetType.Bounds
      target: TLNuBoundsHandle
      order: number
    }

export type TLNuWheelHandler<
  S extends TLNuShape = TLNuShape,
  E extends TLNuEventInfo<S> = TLNuEventInfo<S>
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
  E extends TLNuEventInfo<S> = TLNuEventInfo<S>
> = (info: E, event: TLNuPointerEvent | KeyboardEvent | WheelEvent) => void

export type TLNuKeyboardHandler<
  S extends TLNuShape = TLNuShape,
  E extends TLNuEventInfo<S> = TLNuEventInfo<S>
> = (info: E, event: React.KeyboardEvent) => void

export type TLNuPinchHandler<
  S extends TLNuShape = TLNuShape,
  E extends TLNuEventInfo<S> = TLNuEventInfo<S>
> = (
  info: E,
  gesture: Omit<FullGestureState<'pinch'>, 'event'> & {
    event: WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent
  },
  event: WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent
) => void

export interface TLNuCallbacks<
  S extends TLNuShape = TLNuShape,
  E extends TLNuEventInfo<S> = TLNuEventInfo<S>
> {
  /**
   * Respond to wheel events forwarded to the state by its parent. Run the current active child
   * state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onWheel: TLNuWheelHandler<S, E>
  /**
   * Respond to pointer down events forwarded to the state by its parent. Run the current active
   * child state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onPointerDown: TLNuPointerHandler<S, E>
  /**
   * Respond to pointer up events forwarded to the state by its parent. Run the current active child
   * state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onPointerUp: TLNuPointerHandler<S, E>
  /**
   * Respond to pointer move events forwarded to the state by its parent. Run the current active
   * child state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onPointerMove: TLNuPointerHandler<S, E>

  /**
   * Respond to pointer enter events forwarded to the state by its parent. Run the current active
   * child state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onPointerEnter: TLNuPointerHandler<S, E>
  /**
   * Respond to pointer leave events forwarded to the state by its parent. Run the current active
   * child state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onPointerLeave: TLNuPointerHandler<S, E>

  /**
   * Respond to key down events forwarded to the state by its parent. Run the current active child
   * state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onKeyDown: TLNuKeyboardHandler<S, E>

  /**
   * Respond to key up events forwarded to the state by its parent. Run the current active child
   * state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onKeyUp: TLNuKeyboardHandler<S, E>

  /**
   * Respond to pinch start events forwarded to the state by its parent. Run the current active
   * child state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param gesture The gesture info from useGesture.
   * @param event The DOM event.
   */
  onPinchStart: TLNuPinchHandler<S, E>

  /**
   * Respond to pinch events forwarded to the state by its parent. Run the current active child
   * state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param gesture The gesture info from useGesture.
   * @param event The DOM event.
   */
  onPinch: TLNuPinchHandler<S, E>
  /**
   * Respond to pinch end events forwarded to the state by its parent. Run the current active child
   * state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param gesture The gesture info from useGesture.
   * @param event The DOM event.
   */
  onPinchEnd: TLNuPinchHandler<S, E>
}

export interface TLNuStateEvents<S extends TLNuShape = TLNuShape> extends TLNuCallbacks<S> {
  /**
   * Handle the change from inactive to active.
   *
   * @param info The previous state and any info sent via the transition.
   */
  onEnter: TLNuOnEnter

  /**
   * Handle the change from active to inactive.
   *
   * @param info The next state and any info sent via the transition.
   */
  onExit: TLNuOnExit

  onTransition: TLNuOnTransition

  handleModifierKey: TLNuKeyboardHandler<S>
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

export type TLNuContextBarProps<S extends TLNuShape = TLNuShape> = {
  shapes: S[]
  bounds: TLNuBounds
  scaledBounds: TLNuBounds
  rotation: number
  offset: TLNuOffset
}

export type TLNuContextBarComponent<S extends TLNuShape = TLNuShape> = (
  props: TLNuContextBarProps<S>
) => JSX.Element | null

export type TLNuBoundsDetailProps<S extends TLNuShape = TLNuShape> = {
  shapes: S[]
  bounds: TLNuBounds
  scaledBounds: TLNuBounds
  zoom: number
  detail: 'size' | 'rotation'
}

export type TLNuBoundsDetailComponent<S extends TLNuShape = TLNuShape> = (
  props: TLNuBoundsDetailProps<S>
) => JSX.Element | null

export type TLNuComponents<S extends TLNuShape> = {
  BoundsBackground?: TLNuBoundsComponent<S> | null
  BoundsForeground?: TLNuBoundsComponent<S> | null
  BoundsDetail?: TLNuBoundsDetailComponent<S> | null
  ContextBar?: TLNuContextBarComponent<S> | null
}

export type TLNuOnEnter<T = { fromId: string }> = (info: T) => void
export type TLNuOnExit<T = { toId: string }> = (info: T) => void
export type TLNuOnTransition<T = { toId: string; fromId: string }> = (info: T) => void

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
  S extends TLNuShape = TLNuShape,
  R extends TLNuApp<S> = TLNuApp<S>,
  E extends TLNuSubscriptionEventName = TLNuSubscriptionEventName
> = (app: R, info: TLNuSubscriptionEventInfo<E>) => void

export type TLNuSubscription<
  S extends TLNuShape = TLNuShape,
  R extends TLNuApp<S> = TLNuApp<S>,
  E extends TLNuSubscriptionEventName = TLNuSubscriptionEventName
> = {
  event: E
  callback: TLNuSubscriptionCallback<S, R, E>
}

export type TLSubscribe<S extends TLNuShape = TLNuShape, R extends TLNuApp<S> = TLNuApp<S>> = {
  <E extends TLNuSubscriptionEventName>(subscription: TLNuSubscription<S, R, E>): () => void
  <E extends TLNuSubscriptionEventName>(
    event: E,
    callback: TLNuSubscriptionCallback<S, R, E>
  ): () => void
}

export function isStringArray(arr: string[] | any[]): asserts arr is string[] {
  if (arr[0] && typeof arr[0] !== 'string') {
    throw Error('Expected a string array.')
  }
}

export interface TLNuViewOptions {
  showBounds: boolean
  showResizeHandles: boolean
  showRotateHandle: boolean
  showContextBar: boolean
  showBoundsDetail: boolean
  showBoundsRotation: boolean
}

export interface TLNuContextProviderProps<S extends TLNuShape> extends TLNuCallbacks<S> {
  inputs: TLNuInputs
  viewport: TLNuViewport
  children?: React.ReactNode
  id?: string
  theme?: TLNuTheme
  meta?: any
  components?: TLNuComponents<S>
}

export interface TLNuSubscriptionCallbacks<S extends TLNuShape, R extends TLNuApp<S>> {
  onMount: TLNuSubscriptionCallback<S, R, 'mount'>
  onPersist: TLNuSubscriptionCallback<S, R, 'persist'>
}

export interface TLNuCommonAppProps<S extends TLNuShape, R extends TLNuApp<S> = TLNuApp<S>> {
  id?: string
  meta?: AnyObject
  theme?: Partial<TLNuTheme>
  components?: TLNuComponents<S>
  children?: React.ReactNode
  onMount: TLNuSubscriptionCallback<S, R, 'mount'>
  onPersist: TLNuSubscriptionCallback<S, R, 'persist'>
}

export interface TLNuAppPropsWithoutApp<S extends TLNuShape, R extends TLNuApp<S> = TLNuApp<S>>
  extends TLNuCommonAppProps<S, R> {
  model?: TLNuSerializedApp
  shapeClasses?: TLNuShapeClass<S>[]
  toolClasses?: TLNuToolClass<S, TLNuApp<S>>[]
}

export interface TLNuAppPropsWithApp<S extends TLNuShape, R extends TLNuApp<S> = TLNuApp<S>>
  extends TLNuCommonAppProps<S, R> {
  app: R
}

export interface TLNuRendererProps<S extends TLNuShape> extends Partial<TLNuViewOptions> {
  bindings: TLNuBinding[]
  brush: TLNuBounds
  children: React.ReactNode
  hoveredShape: S
  editingShape: S
  bindingShape: S
  id: string
  selectedBounds: TLNuBounds
  selectedShapes: S[]
  shapes: S[]
  theme: TLNuTheme
  showBounds?: boolean
  showResizeHandles?: boolean
  showRotateHandle?: boolean
  showContextBar?: boolean
  showBoundsDetail?: boolean
  showBoundsRotation?: boolean
}

export type AnyObject = { [key: string]: any }

export type TLNuShortcut<
  S extends TLNuShape = TLNuShape,
  R extends TLNuRootState<S> = TLNuRootState<S>,
  T extends R | TLNuState<S, R, any> = any
> = {
  keys: string
  fn: (root: R, state: T) => void
}
