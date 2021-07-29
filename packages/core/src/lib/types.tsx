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

export interface TLPinchInfo extends TLPointerInfo {
  distanceDelta: number
}

export interface TLZoomInfo extends TLPointerInfo {
  delta: number
}

export interface TLPanInfo extends TLPointerInfo {
  delta: number[]
}

export interface TLCallbacks {
  onChange: (ids: string[]) => void

  // Camera events
  onPinchStart: (point: number[]) => void
  onPinchEnd: (point: number[]) => void
  onPinch: (info: TLPinchInfo) => void
  onPan: (info: TLPanInfo) => void
  onZoom: (info: TLZoomInfo) => void

  // Pointer Events
  onPointerMove: (info: TLPointerInfo) => void
  onStopPointing: (info: TLPointerInfo) => void

  // Shape
  onPointShape: (info: TLPointerInfo) => void
  onDoublePointShape: (info: TLPointerInfo) => void
  onRightPointShape: (info: TLPointerInfo) => void
  onMoveOverShape: (info: TLPointerInfo) => void
  onUnhoverShape: (info: TLPointerInfo) => void
  onHoverShape: (info: TLPointerInfo) => void

  // Canvas (background)
  onPointCanvas: (info: TLPointerInfo) => void
  onDoublePointCanvas: (info: TLPointerInfo) => void
  onRightPointCanvas: (info: TLPointerInfo) => void

  // Bounds (bounding box background)
  onPointBounds: (info: TLPointerInfo) => void
  onDoublePointBounds: (info: TLPointerInfo) => void
  onRightPointBounds: (info: TLPointerInfo) => void
  onDragBounds: (info: TLPointerInfo) => void

  // Bounds handles (corners, edges)
  onPointBoundsHandle: (info: TLPointerInfo) => void
  onDoublePointBoundsHandle: (info: TLPointerInfo) => void
  onDragBoundsHandle: (info: TLPointerInfo) => void

  // Handles (ie the handles of a selected arrow)
  onPointHandle: (info: TLPointerInfo) => void
  onDoublePointHandle: (info: TLPointerInfo) => void
  onRightPointHandle: (info: TLPointerInfo) => void
  onMoveOverHandle: (info: TLPointerInfo) => void
  onHoverHandle: (info: TLPointerInfo) => void
  onUnhoverHandle: (info: TLPointerInfo) => void

  // keys
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

export interface TLPointerInfo {
  target: string
  pointerId: number
  origin: number[]
  point: number[]
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

  abstract transform(shape: T, bounds: TLBounds, info: TLTransformInfo<T>): TLShapeUtil<T>

  abstract transformSingle(shape: T, bounds: TLBounds, info: TLTransformInfo<T>): TLShapeUtil<T>

  create(props: Partial<T>): T {
    return { ...this.defaultProps, ...props }
  }

  translateTo(shape: T, point: number[]) {
    shape.point = point
    return this
  }

  translateBy(shape: T, delta: number[]) {
    shape.point = [shape.point[0] + delta[0], shape.point[1] + delta[1]]
    return this
  }

  rotateTo(shape: T, rotation: number) {
    shape.rotation = rotation
    return this
  }

  rotateBy(shape: T, rotation: number) {
    shape.rotation = shape.rotation ? shape.rotation + rotation : rotation
    return this
  }

  mutate(shape: T, props: Partial<T>) {
    Object.assign(shape, props)
    return this
  }

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

  setProperty<P extends keyof T>(shape: T, prop: P, value: T[P]): TLShapeUtil<T> {
    shape[prop] = value
    return this
  }

  onChildrenChange(shape: T, children: TLShape[]): TLShapeUtil<T> {
    return this
  }

  onBindingChange(
    shape: T,
    bindings: TLBinding,
    target: TLShape,
    targetBounds: TLBounds,
  ): TLShapeUtil<T> {
    return this
  }

  onHandleChange(shape: T, handle: Partial<T['handles']>, info: TLPointerInfo): TLShapeUtil<T> {
    return this
  }

  onRightPointHandle(shape: T, handle: Partial<T['handles']>, info: TLPointerInfo): TLShapeUtil<T> {
    return this
  }

  onDoublePointHandle(
    shape: T,
    handle: Partial<T['handles']>,
    info: TLPointerInfo,
  ): TLShapeUtil<T> {
    return this
  }

  onSessionComplete(shape: T): TLShapeUtil<T> {
    return this
  }

  onBoundsReset(shape: T): TLShapeUtil<T> {
    return this
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
