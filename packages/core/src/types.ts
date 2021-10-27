/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* --------------------- Primary -------------------- */

import type React from 'react'

export type Patch<T> = Partial<{ [P in keyof T]: T | Partial<T> | Patch<T[P]> }>

export type TLForwardedRef<T> =
  | ((instance: T | null) => void)
  | React.MutableRefObject<T | null>
  | null

export interface TLPage<T extends TLShape, B extends TLBinding> {
  id: string
  name?: string
  childIndex?: number
  shapes: Record<string, T>
  bindings: Record<string, B>
}

export interface TLPageState {
  id: string
  selectedIds: string[]
  camera: {
    point: number[]
    zoom: number
  }
  brush?: TLBounds | null
  pointedId?: string | null
  hoveredId?: string | null
  editingId?: string | null
  bindingId?: string | null
  currentParentId?: string | null
}

export interface TLUser<T extends TLShape> {
  id: string
  color: string
  point: number[]
  selectedIds: string[]
  activeShapes: T[]
}

export type TLUsers<T extends TLShape, U extends TLUser<T> = TLUser<T>> = Record<string, U>

export type TLSnapLine = number[][]

export interface TLHandle {
  id: string
  index: number
  point: number[]
  canBind?: boolean
  bindingId?: string
}

export interface TLShape {
  id: string
  type: string
  parentId: string
  childIndex: number
  name: string
  point: number[]
  rotation?: number
  children?: string[]
  handles?: Record<string, TLHandle>
  isLocked?: boolean
  isHidden?: boolean
  isEditing?: boolean
  isGenerated?: boolean
  isAspectRatioLocked?: boolean
}

export type TLComponentProps<T extends TLShape, E = any, M = any> = {
  shape: T
  isEditing: boolean
  isBinding: boolean
  isHovered: boolean
  isSelected: boolean
  isCurrentParent: boolean
  meta: M extends any ? M : never
  onShapeChange?: TLCallbacks<T>['onShapeChange']
  onShapeBlur?: TLCallbacks<T>['onShapeBlur']
  events: {
    onPointerDown: (e: React.PointerEvent<E>) => void
    onPointerUp: (e: React.PointerEvent<E>) => void
    onPointerEnter: (e: React.PointerEvent<E>) => void
    onPointerMove: (e: React.PointerEvent<E>) => void
    onPointerLeave: (e: React.PointerEvent<E>) => void
  }
} & React.RefAttributes<E>

export interface TLShapeProps<T extends TLShape, E = any, M = any>
  extends TLComponentProps<T, E, M> {
  ref: TLForwardedRef<E>
  shape: T
}

export interface TLTool {
  id: string
  name: string
}

export interface TLBinding<M = any> {
  id: string
  type: string
  toId: string
  fromId: string
  meta: M
}

export interface TLTheme {
  accent?: string
  brushFill?: string
  brushStroke?: string
  selectFill?: string
  selectStroke?: string
  background?: string
  foreground?: string
}

export type TLWheelEventHandler = (
  info: TLPointerInfo<string>,
  e: React.WheelEvent<Element> | WheelEvent
) => void

export type TLPinchEventHandler = (
  info: TLPointerInfo<string>,
  e:
    | React.WheelEvent<Element>
    | WheelEvent
    | React.TouchEvent<Element>
    | TouchEvent
    | React.PointerEvent<Element>
    | PointerEventInit
) => void

export type TLShapeChangeHandler<T, K = any> = (
  shape: { id: string } & Partial<T>,
  info?: K
) => void

export type TLShapeBlurHandler<K = any> = (info?: K) => void

export type TLKeyboardEventHandler = (key: string, info: TLKeyboardInfo, e: KeyboardEvent) => void

export type TLPointerEventHandler = (info: TLPointerInfo<string>, e: React.PointerEvent) => void

export type TLShapeCloneHandler = (
  info: TLPointerInfo<
    'top' | 'right' | 'bottom' | 'left' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
  >,
  e: React.PointerEvent
) => void

export type TLShapeLinkHandler = (info: TLPointerInfo<'link'>, e: React.PointerEvent) => void

export type TLCanvasEventHandler = (info: TLPointerInfo<'canvas'>, e: React.PointerEvent) => void

export type TLBoundsEventHandler = (info: TLPointerInfo<'bounds'>, e: React.PointerEvent) => void

export type TLBoundsHandleEventHandler = (
  info: TLPointerInfo<TLBoundsHandle>,
  e: React.PointerEvent
) => void

export interface TLCallbacks<T extends TLShape> {
  // Camera events
  onPinchStart: TLPinchEventHandler
  onPinchEnd: TLPinchEventHandler
  onPinch: TLPinchEventHandler
  onPan: TLWheelEventHandler
  onZoom: TLWheelEventHandler

  // Pointer Events
  onPointerMove: TLPointerEventHandler
  onPointerUp: TLPointerEventHandler
  onPointerDown: TLPointerEventHandler

  // Canvas (background)
  onPointCanvas: TLCanvasEventHandler
  onDoubleClickCanvas: TLCanvasEventHandler
  onRightPointCanvas: TLCanvasEventHandler
  onDragCanvas: TLCanvasEventHandler
  onReleaseCanvas: TLCanvasEventHandler

  // Shape
  onPointShape: TLPointerEventHandler
  onDoubleClickShape: TLPointerEventHandler
  onRightPointShape: TLPointerEventHandler
  onDragShape: TLPointerEventHandler
  onHoverShape: TLPointerEventHandler
  onUnhoverShape: TLPointerEventHandler
  onReleaseShape: TLPointerEventHandler

  // Bounds (bounding box background)
  onPointBounds: TLBoundsEventHandler
  onDoubleClickBounds: TLBoundsEventHandler
  onRightPointBounds: TLBoundsEventHandler
  onDragBounds: TLBoundsEventHandler
  onHoverBounds: TLBoundsEventHandler
  onUnhoverBounds: TLBoundsEventHandler
  onReleaseBounds: TLBoundsEventHandler

  // Bounds handles (corners, edges)
  onPointBoundsHandle: TLBoundsHandleEventHandler
  onDoubleClickBoundsHandle: TLBoundsHandleEventHandler
  onRightPointBoundsHandle: TLBoundsHandleEventHandler
  onDragBoundsHandle: TLBoundsHandleEventHandler
  onHoverBoundsHandle: TLBoundsHandleEventHandler
  onUnhoverBoundsHandle: TLBoundsHandleEventHandler
  onReleaseBoundsHandle: TLBoundsHandleEventHandler

  // Handles (ie the handles of a selected arrow)
  onPointHandle: TLPointerEventHandler
  onDoubleClickHandle: TLPointerEventHandler
  onRightPointHandle: TLPointerEventHandler
  onDragHandle: TLPointerEventHandler
  onHoverHandle: TLPointerEventHandler
  onUnhoverHandle: TLPointerEventHandler
  onReleaseHandle: TLPointerEventHandler

  // Misc
  onShapeChange: TLShapeChangeHandler<T, any>
  onShapeBlur: TLShapeBlurHandler<any>
  onShapeClone: TLShapeCloneHandler
  onRenderCountChange: (ids: string[]) => void
  onError: (error: Error) => void
  onBoundsChange: (bounds: TLBounds) => void

  // Keyboard event handlers
  onKeyDown: TLKeyboardEventHandler
  onKeyUp: TLKeyboardEventHandler
}

export interface TLBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  rotation?: number
}

export interface TLBoundsWithCenter extends TLBounds {
  midX: number
  midY: number
}

export type TLIntersection = {
  didIntersect: boolean
  message: string
  points: number[][]
}

export enum TLBoundsEdge {
  Top = 'top_edge',
  Right = 'right_edge',
  Bottom = 'bottom_edge',
  Left = 'left_edge',
}

export enum TLBoundsCorner {
  TopLeft = 'top_left_corner',
  TopRight = 'top_right_corner',
  BottomRight = 'bottom_right_corner',
  BottomLeft = 'bottom_left_corner',
}

export type TLBoundsHandle = TLBoundsCorner | TLBoundsEdge | 'rotate' | 'center' | 'left' | 'right'

export interface TLPointerInfo<T extends string = string> {
  target: T
  pointerId: number
  origin: number[]
  point: number[]
  delta: number[]
  pressure: number
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  spaceKey: boolean
}

export interface TLKeyboardInfo {
  origin: number[]
  point: number[]
  key: string
  keys: string[]
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

export interface TLTransformInfo<T extends TLShape> {
  type: TLBoundsEdge | TLBoundsCorner
  initialShape: T
  scaleX: number
  scaleY: number
  transformOrigin: number[]
}

export interface TLBezierCurveSegment {
  start: number[]
  tangentStart: number[]
  normalStart: number[]
  pressureStart: number
  end: number[]
  tangentEnd: number[]
  normalEnd: number[]
  pressureEnd: number
}

export enum SnapPoints {
  minX = 'minX',
  midX = 'midX',
  maxX = 'maxX',
  minY = 'minY',
  midY = 'midY',
  maxY = 'maxY',
}

export type Snap =
  | { id: SnapPoints; isSnapped: false }
  | {
      id: SnapPoints
      isSnapped: true
      to: number
      B: TLBoundsWithCenter
      distance: number
    }

/* -------------------- Internal -------------------- */

export interface IShapeTreeNode<T extends TLShape, M = any> {
  shape: T
  children?: IShapeTreeNode<TLShape, M>[]
  isEditing: boolean
  isBinding: boolean
  isHovered: boolean
  isSelected: boolean
  isCurrentParent: boolean
  meta?: M extends any ? M : never
}

/* -------------------------------------------------- */
/*                    Utility Types                   */
/* -------------------------------------------------- */

export type MappedByType<K extends string, T extends { type: K }> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [P in T['type']]: T extends any ? (P extends T['type'] ? T : never) : never
}

export type RequiredKeys<T> = {
  [K in keyof T]-?: Record<string, unknown> extends Pick<T, K> ? never : K
}[keyof T]
