/* --------------------- Primary -------------------- */

import React from 'react'

export interface TLDocument<T extends TLShape> {
  currentPageId: string
  pages: Record<string, TLPage<T>>
  pageStates: Record<string, TLPageState>
}

export interface TLPage<T extends TLShape> {
  id: string
  shapes: Record<string, T>
  bindings: Record<string, TLBinding>
  backgroundColor?: string
}

export interface TLPageState {
  id: string
  brush?: Bounds
  pointedId?: string
  hoveredId?: string
  editingId?: string
  editingBindingId?: string
  currentParentId: string
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
  rotation: number
  children?: string[]
  handles?: Record<string, TLHandle>
  isLocked?: boolean
  isHidden?: boolean
  isEditing?: boolean
  isGenerated?: boolean
  isAspectRatioLocked?: boolean
}

export type TLShapeUtils<T extends TLShape> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [P in T['type']]: T extends any
    ? P extends T['type']
      ? TLShapeUtil<T>
      : never
    : never
}

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
  isReadonlyMode: boolean
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

export interface TLCallbacks {
  onChange: (ids: string[]) => void

  // Camera events
  onPinchStart: (point: number[]) => void
  onPinchEnd: (point: number[]) => void
  onPinch: (point: number[], delta: number[], distanceDelta: number) => void
  onZoom: (point: number[], zoom: number) => void
  onPan: (delta: number[]) => void

  // Pointer Events
  onPointerMove: (info: PointerInfo) => void
  onStopPointing: (info: PointerInfo) => void

  // Shape
  onPointShape: (info: PointerInfo) => void
  onDoublePointShape: (info: PointerInfo) => void
  onRightPointShape: (info: PointerInfo) => void
  onMoveOverShape: (info: PointerInfo) => void
  onUnhoverShape: (info: PointerInfo) => void
  onHoverShape: (info: PointerInfo) => void

  // Canvas (background)
  onPointCanvas: (info: PointerInfo) => void
  onDoublePointCanvas: (info: PointerInfo) => void
  onRightPointCanvas: (info: PointerInfo) => void

  // Bounds (bounding box background)
  onPointBounds: (info: PointerInfo) => void
  onDoublePointBounds: (info: PointerInfo) => void
  onRightPointBounds: (info: PointerInfo) => void

  // Bounds handles (corners, edges)
  onPointBoundsHandle: (info: PointerInfo) => void
  onDoublePointBoundsHandle: (info: PointerInfo) => void

  // Handles (ie the handles of a selected arrow)
  onPointHandle: (info: PointerInfo) => void
  onDoublePointHandle: (info: PointerInfo) => void
  onRightPointHandle: (info: PointerInfo) => void
  onMoveOverHandle: (info: PointerInfo) => void
  onHoverHandle: (info: PointerInfo) => void
  onUnhoverHandle: (info: PointerInfo) => void

  // keys
  onBlurEditingShape: () => void
  onError: (error: Error) => void
}

/* -------------------- Secondary ------------------- */

export interface ShapeTreeNode {
  shape: TLShape
  children: ShapeTreeNode[]
  isEditing: boolean
  isHovered: boolean
  isSelected: boolean
  isBinding: boolean
  isDarkMode: boolean
  isCurrentParent: boolean
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  rotation?: number
}

export interface BezierCurveSegment {
  start: number[]
  tangentStart: number[]
  normalStart: number[]
  pressureStart: number
  end: number[]
  tangentEnd: number[]
  normalEnd: number[]
  pressureEnd: number
}

export enum Edge {
  Top = 'top_edge',
  Right = 'right_edge',
  Bottom = 'bottom_edge',
  Left = 'left_edge',
}

export enum Corner {
  TopLeft = 'top_left_corner',
  TopRight = 'top_right_corner',
  BottomRight = 'bottom_right_corner',
  BottomLeft = 'bottom_left_corner',
}

export type Intersection = {
  didIntersect: boolean
  message: string
  points: number[][]
}

/* -------------------------------------------------- */
/*                         Inputs                     */
/* -------------------------------------------------- */

export interface PointerInfo {
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

export interface KeyboardInfo {
  key: string
  keys: string[]
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

export interface TransformInfo<T extends TLShape> {
  type: Edge | Corner
  initialShape: T
  scaleX: number
  scaleY: number
  transformOrigin: number[]
}

/* -------------------------------------------------- */
/*                   Shape Utility                    */
/* -------------------------------------------------- */

export abstract class TLShapeUtil<T extends TLShape> {
  boundsCache = new WeakMap<TLShape, Bounds>()

  isEditableText = false

  abstract type: T['type']

  abstract defaultProps: T

  abstract render(shape: T, info: TLRenderInfo): JSX.Element

  abstract getBounds(shape: T): Bounds

  abstract getRotatedBounds(shape: T): Bounds

  abstract hitTest(shape: T, point: number[]): boolean

  abstract hitTestBounds(shape: T, bounds: Bounds): boolean

  abstract transform(
    shape: T,
    bounds: Bounds,
    info: TransformInfo<T>
  ): TLShapeUtil<T>

  abstract transformSingle(
    shape: T,
    bounds: Bounds,
    info: TransformInfo<T>
  ): TLShapeUtil<T>

  create(props: Partial<TLShape>) {
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
    shape.rotation += rotation
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

  setProperty<P extends keyof T>(
    shape: T,
    prop: P,
    value: T[P]
  ): TLShapeUtil<T> {
    shape[prop] = value
    return this
  }

  onChildrenChange(shape: T, children: TLShape[]): TLShapeUtil<T> {
    return this
  }

  onBindingChange(
    shape: T,
    bindings: Record<string, TLBinding>
  ): TLShapeUtil<T> {
    return this
  }

  onHandleChange(
    shape: T,
    handle: Partial<T['handles']>,
    info: PointerInfo
  ): TLShapeUtil<T> {
    return this
  }

  onRightPointHandle(
    shape: T,
    handle: Partial<T['handles']>,
    info: PointerInfo
  ): TLShapeUtil<T> {
    return this
  }

  onDoublePointHandle(
    shape: T,
    handle: Partial<T['handles']>,
    info: PointerInfo
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

/* -------------------------------------------------- */
/*                    Utility Types                   */
/* -------------------------------------------------- */

export type MappedByType<T extends { type: string }> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [P in T['type']]: T extends any ? (P extends T['type'] ? T : never) : never
}
