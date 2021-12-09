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

export type TLNuEventInfo =
  | { type: TLNuTargetType.Canvas; target: 'canvas'; order: number }
  | { type: TLNuTargetType.Shape; target: TLNuShape; order: number }
  | {
      type: TLNuTargetType.Bounds
      target: TLNuBoundsHandle
      order: number
    }

export type TLNuWheelHandler<E extends TLNuEventInfo = TLNuEventInfo> = (
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

export type TLNuPointerHandler<E extends TLNuEventInfo = TLNuEventInfo> = (
  info: E,
  event: TLNuPointerEvent | KeyboardEvent | WheelEvent
) => void

export type TLNuKeyboardHandler<E extends TLNuEventInfo = TLNuEventInfo> = (
  info: E,
  event: React.KeyboardEvent
) => void

export type TLNuPinchHandler<E extends TLNuEventInfo = TLNuEventInfo> = (
  info: E,
  gesture: Omit<FullGestureState<'pinch'>, 'event'> & {
    event: WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent
  },
  event: WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent
) => void

export interface TLNuCallbacks<E extends TLNuEventInfo = TLNuEventInfo> {
  /**
   * Respond to wheel events forwarded to the state by its parent. Run the current active child
   * state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onWheel: TLNuWheelHandler<E>
  /**
   * Respond to pointer down events forwarded to the state by its parent. Run the current active
   * child state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onPointerDown: TLNuPointerHandler<E>
  /**
   * Respond to pointer up events forwarded to the state by its parent. Run the current active child
   * state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onPointerUp: TLNuPointerHandler<E>
  /**
   * Respond to pointer move events forwarded to the state by its parent. Run the current active
   * child state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onPointerMove: TLNuPointerHandler<E>

  /**
   * Respond to pointer enter events forwarded to the state by its parent. Run the current active
   * child state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onPointerEnter: TLNuPointerHandler<E>
  /**
   * Respond to pointer leave events forwarded to the state by its parent. Run the current active
   * child state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onPointerLeave: TLNuPointerHandler<E>

  /**
   * Respond to key down events forwarded to the state by its parent. Run the current active child
   * state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onKeyDown: TLNuKeyboardHandler<E>

  /**
   * Respond to key up events forwarded to the state by its parent. Run the current active child
   * state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param event The DOM event.
   */
  onKeyUp: TLNuKeyboardHandler<E>

  /**
   * Respond to pinch start events forwarded to the state by its parent. Run the current active
   * child state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param gesture The gesture info from useGesture.
   * @param event The DOM event.
   */
  onPinchStart: TLNuPinchHandler<E>

  /**
   * Respond to pinch events forwarded to the state by its parent. Run the current active child
   * state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param gesture The gesture info from useGesture.
   * @param event The DOM event.
   */
  onPinch: TLNuPinchHandler<E>
  /**
   * Respond to pinch end events forwarded to the state by its parent. Run the current active child
   * state's handler, then the state's own handler.
   *
   * @param info The event info from TLNuInputs.
   * @param gesture The gesture info from useGesture.
   * @param event The DOM event.
   */
  onPinchEnd: TLNuPinchHandler<E>
}

export interface TLNuStateEvents extends TLNuCallbacks {
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

  handleModifierKey: TLNuKeyboardHandler
}

export type TLNuBoundsComponentProps = {
  zoom: number
  shapes: TLNuShape[]
  bounds: TLNuBounds
  showResizeHandles: boolean
  showRotateHandle: boolean
}

export type TLNuBoundsComponent = (props: TLNuBoundsComponentProps) => JSX.Element | null

export interface TLNuOffset {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

export type TLNuContextBarComponent = (props: {
  shapes: TLNuShape[]
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

export type TLNuComponents = Partial<{
  BoundsBackground: TLNuBoundsComponent | null
  BoundsForeground: TLNuBoundsComponent | null
  BoundsDetail: TLNuBoundsDetailComponent | null
  ContextBar: TLNuContextBarComponent | null
}>

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
  E extends TLNuSubscriptionEventName = TLNuSubscriptionEventName
> = (app: TLNuApp<S>, info: TLNuSubscriptionEventInfo<E>) => void

export type TLNuSubscription<
  S extends TLNuShape = TLNuShape,
  E extends TLNuSubscriptionEventName = TLNuSubscriptionEventName
> = {
  event: E
  callback: TLNuSubscriptionCallback<S, E>
}

export type TLSubscribe<S extends TLNuShape = TLNuShape> = {
  <E extends TLNuSubscriptionEventName>(subscription: TLNuSubscription<S, E>): () => void
  <E extends TLNuSubscriptionEventName>(
    event: E,
    callback: TLNuSubscriptionCallback<S, E>
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

export interface TLNuContextProviderProps extends TLNuCallbacks {
  inputs: TLNuInputs
  viewport: TLNuViewport
  children?: React.ReactNode
  components?: Partial<TLNuComponents>
  id?: string
  theme?: TLNuTheme
  meta?: any
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
}

export interface TLNuSubscriptionCallbacks<S extends TLNuShape = TLNuShape> {
  onMount: TLNuSubscriptionCallback<S, 'mount'>
  onPersist: TLNuSubscriptionCallback<S, 'persist'>
}

export interface TLNuCommonAppProps<S extends TLNuShape>
  extends Partial<TLNuSubscriptionCallbacks<S>>,
    Partial<TLNuCallbacks>,
    Partial<TLNuViewOptions> {
  id?: string
  meta?: Record<string, unknown>
  theme?: Partial<TLNuTheme>
  components?: Partial<TLNuComponents>
  children?: React.ReactNode
}

export interface TLNuAppPropsWithoutApp<S extends TLNuShape> extends TLNuCommonAppProps<S> {
  model?: TLNuSerializedApp
  shapeClasses?: TLNuShapeClass<S>[]
  toolClasses?: TLNuToolClass[]
}

export interface TLNuAppPropsWithApp<S extends TLNuShape> extends TLNuCommonAppProps<S> {
  app: TLNuApp<S>
}

export type AnyObject = { [key: string]: any }

export type TLNuShortcut<
  R extends TLNuRootState = TLNuRootState,
  T extends R | TLNuState<R, any> = any
> = {
  keys: string
  fn: (root: R, state: T) => void
}
