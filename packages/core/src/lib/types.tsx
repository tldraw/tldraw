/* --------------------- Primary -------------------- */

import React from 'react'

export interface TLPage<T extends TLShape> {
  id: string
  shapes: Record<string, T>
  bindings: Record<string, TLBinding>
  backgroundColor?: string
}

export interface TLPageState {
  id: string
  brush?: TLBounds
  pointedId?: string
  hoveredId?: string
  editingId?: string
  editingBindingId?: string
  boundsRotation?: number
  currentParentId?: string
  selectedIds: string[]
  camera: {
    point: number[]
    zoom: number
  }
}

export interface TLHandle {
  id: string
  index: number
  point: number[]
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

export type TLShapeUtils<T extends TLShape> = Record<string, TLShapeUtil<T>>

export interface TLRenderInfo {
  ref?: React.RefObject<HTMLElement>
  isEditing: boolean
  isHovered: boolean
  isSelected: boolean
  isBinding: boolean
  isDarkMode: boolean
  isCurrentParent: boolean
}

export interface TLTool {
  id: string
  name: string
}

export interface TLBinding {
  id: string
  type: string
  toId: string
  fromId: string
}

export interface TLSettings {
  isDebugMode: boolean
  isDarkMode: boolean
  isPenMode: boolean
}

export interface TLTheme {
  brushFill?: string
  brushStroke?: string
  selectFill?: string
  selectStroke?: string
  background?: string
  foreground?: string
}

export type TLPointerEventHandler<T = unknown> = (this: T, info: TLPointerInfo<string>) => void
export type TLCanvasEventHandler<T = unknown> = (this: T, info: TLPointerInfo<'canvas'>) => void
export type TLBoundsEventHandler<T = unknown> = (this: T, info: TLPointerInfo<'bounds'>) => void
export type TLBoundsHandleEventHandler<T = unknown> = (
  this: T,
  info: TLPointerInfo<TLBoundsCorner | TLBoundsEdge | 'rotate'>,
) => void

export interface TLCallbacks<T = unknown> {
  onChange: (ids: string[]) => void

  // Camera events
  onPinchStart: TLPointerEventHandler<T>
  onPinchEnd: TLPointerEventHandler<T>
  onPinch: TLPointerEventHandler<T>
  onPan: TLPointerEventHandler<T>
  onZoom: TLPointerEventHandler<T>

  // Pointer Events
  onPointerMove: TLPointerEventHandler<T>
  onPointerUp: TLPointerEventHandler<T>

  // Canvas (background)
  onPointCanvas: TLCanvasEventHandler<T>
  onDoublePointCanvas: TLCanvasEventHandler<T>
  onRightPointCanvas: TLCanvasEventHandler<T>
  onDragCanvas: TLCanvasEventHandler<T>
  onReleaseCanvas: TLCanvasEventHandler<T>

  // Shape
  onPointShape: TLPointerEventHandler<T>
  onDoublePointShape: TLPointerEventHandler<T>
  onRightPointShape: TLPointerEventHandler<T>
  onDragShape: TLPointerEventHandler<T>
  onHoverShape: TLPointerEventHandler<T>
  onUnhoverShape: TLPointerEventHandler<T>
  onReleaseShape: TLPointerEventHandler<T>

  // Bounds (bounding box background)
  onPointBounds: TLBoundsEventHandler<T>
  onDoublePointBounds: TLBoundsEventHandler<T>
  onRightPointBounds: TLBoundsEventHandler<T>
  onDragBounds: TLBoundsEventHandler<T>
  onHoverBounds: TLBoundsEventHandler<T>
  onUnhoverBounds: TLBoundsEventHandler<T>
  onReleaseBounds: TLBoundsEventHandler<T>

  // Bounds handles (corners, edges)
  onPointBoundsHandle: TLBoundsHandleEventHandler<T>
  onDoublePointBoundsHandle: TLBoundsHandleEventHandler<T>
  onRightPointBoundsHandle: TLBoundsHandleEventHandler<T>
  onDragBoundsHandle: TLBoundsHandleEventHandler<T>
  onHoverBoundsHandle: TLBoundsHandleEventHandler<T>
  onUnhoverBoundsHandle: TLBoundsHandleEventHandler<T>
  onReleaseBoundsHandle: TLBoundsHandleEventHandler<T>

  // Handles (ie the handles of a selected arrow)
  onPointHandle: TLPointerEventHandler<T>
  onDoublePointHandle: TLPointerEventHandler<T>
  onRightPointHandle: TLPointerEventHandler<T>
  onDragHandle: TLPointerEventHandler<T>
  onHoverHandle: TLPointerEventHandler<T>
  onUnhoverHandle: TLPointerEventHandler<T>
  onReleaseHandle: TLPointerEventHandler<T>

  // Misc
  onBlurEditingShape: () => void
  onError: (error: Error) => void
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

/* -------------------------------------------------- */
/*                   Shape Utility                    */
/* -------------------------------------------------- */

export abstract class TLShapeUtil<T extends TLShape> {
  boundsCache = new WeakMap<TLShape, TLBounds>()
  isEditableText = false
  isAspectRatioLocked = false
  canEdit = false

  abstract type: T['type']

  abstract defaultProps: T

  abstract render(shape: T, info: TLRenderInfo): JSX.Element

  abstract getBounds(shape: T): TLBounds

  abstract getRotatedBounds(shape: T): TLBounds

  abstract hitTest(shape: T, point: number[]): boolean

  abstract hitTestBounds(shape: T, bounds: TLBounds): boolean

  abstract transform(shape: T, bounds: TLBounds, info: TLTransformInfo<T>): T

  abstract transformSingle(shape: T, bounds: TLBounds, info: TLTransformInfo<T>): T

  shouldRender(prev: T, next: T): boolean {
    return true
  }

  shouldDelete(shape: T): boolean {
    return false
  }

  getCenter(shape: T): number[] {
    const bounds = this.getBounds(shape)
    return [bounds.width / 2, bounds.height / 2]
  }

  create(props: Partial<T>): T {
    return { ...this.defaultProps, ...props }
  }

  mutate(shape: T, props: Partial<T>): T {
    return { ...shape, ...props }
  }

  updateChildren<K extends TLShape>(shape: T, children: K[]): Partial<K>[] | void {
    return
  }

  onChildrenChange(shape: T, children: TLShape[]): Partial<T> | void {
    return
  }

  onBindingChange(
    shape: T,
    binding: TLBinding,
    target: TLShape,
    targetBounds: TLBounds,
  ): Partial<T> | void {
    return
  }

  onHandleChange(shape: T, handle: Partial<T['handles']>, info: TLPointerInfo): Partial<T> | void {
    return
  }

  onRightPointHandle(
    shape: T,
    handle: Partial<T['handles']>,
    info: TLPointerInfo,
  ): Partial<T> | void {
    return
  }

  onDoublePointHandle(
    shape: T,
    handle: Partial<T['handles']>,
    info: TLPointerInfo,
  ): Partial<T> | void {
    return
  }

  onSessionComplete(shape: T): Partial<T> | void {
    return
  }

  onBoundsReset(shape: T): Partial<T> | void {
    return
  }
}

/* -------------------- Internal -------------------- */

export interface IShapeTreeNode {
  shape: TLShape
  children: IShapeTreeNode[]
  isEditing: boolean
  isHovered: boolean
  isSelected: boolean
  isBinding: boolean
  isDarkMode: boolean
  isCurrentParent: boolean
}

export enum MoveType {
  Backward,
  Forward,
  ToFront,
  ToBack,
}

export enum AlignType {
  Top,
  CenterVertical,
  Bottom,
  Left,
  CenterHorizontal,
  Right,
}

export enum StretchType {
  Horizontal,
  Vertical,
}

export enum DistributeType {
  Horizontal,
  Vertical,
}

/* -------------------------------------------------- */
/*                    Utility Types                   */
/* -------------------------------------------------- */

export type MappedByType<T extends { type: string }> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [P in T['type']]: T extends any ? (P extends T['type'] ? T : never) : never
}

export type RequiredKeys<T> = {
  [K in keyof T]-?: Record<string, unknown> extends Pick<T, K> ? never : K
}[keyof T]
