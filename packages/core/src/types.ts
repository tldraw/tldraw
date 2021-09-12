/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* --------------------- Primary -------------------- */

import { Vec } from '@tldraw/vec'
import React, { ForwardedRef } from 'react'
import { intersectPolylineBounds } from '@tldraw/intersect'

export type Patch<T> = Partial<{ [P in keyof T]: T | Partial<T> | Patch<T[P]> }>

export interface TLPage<T extends TLShape, B extends TLBinding> {
  id: string
  name?: string
  childIndex?: number
  shapes: Record<string, T>
  bindings: Record<string, B>
  backgroundColor?: string
}

export interface TLPageState {
  id: string
  selectedIds: string[]
  camera: {
    point: number[]
    zoom: number
  }
  brush?: TLBounds
  pointedId?: string | null
  hoveredId?: string | null
  editingId?: string | null
  bindingId?: string | null
  boundsRotation?: number
  currentParentId?: string | null
}

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

export type TLShapeUtils<T extends TLShape, E extends Element> = Record<string, TLShapeUtil<T, E>>

export interface TLRenderInfo<T extends TLShape, M = any, E = any> {
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
}

export interface TLShapeProps<T extends TLShape, E = any, M = any> extends TLRenderInfo<T, M, E> {
  ref: ForwardedRef<E>
  shape: T
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

export interface TLTheme {
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
export type TLPointerEventHandler = (info: TLPointerInfo<string>, e: React.PointerEvent) => void
export type TLCanvasEventHandler = (info: TLPointerInfo<'canvas'>, e: React.PointerEvent) => void
export type TLBoundsEventHandler = (info: TLPointerInfo<'bounds'>, e: React.PointerEvent) => void
export type TLBoundsHandleEventHandler = (
  info: TLPointerInfo<TLBoundsCorner | TLBoundsEdge | 'rotate'>,
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
  onRenderCountChange: (ids: string[]) => void
  onShapeChange: (shape: { id: string } & Partial<T>) => void
  onShapeBlur: () => void
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

export abstract class TLShapeUtil<T extends TLShape, E extends Element> {
  refMap = new Map<string, React.RefObject<E>>()

  boundsCache = new WeakMap<TLShape, TLBounds>()

  isEditableText = false

  isAspectRatioLocked = false

  canEdit = false

  canBind = false

  abstract type: T['type']

  abstract defaultProps: T

  abstract render: React.ForwardRefExoticComponent<
    { shape: T; ref: React.ForwardedRef<E> } & TLRenderInfo<T> & React.RefAttributes<E>
  >

  abstract renderIndicator(shape: T): JSX.Element | null

  abstract getBounds(shape: T): TLBounds

  abstract getRotatedBounds(shape: T): TLBounds

  shouldRender(_prev: T, _next: T): boolean {
    return true
  }

  shouldDelete(_shape: T): boolean {
    return false
  }

  getCenter(shape: T): number[] {
    const bounds = this.getBounds(shape)
    return [bounds.width / 2, bounds.height / 2]
  }

  getRef(shape: T): React.RefObject<E> {
    if (!this.refMap.has(shape.id)) {
      this.refMap.set(shape.id, React.createRef<E>())
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.refMap.get(shape.id)!
  }

  getBindingPoint(
    shape: T,
    fromShape: TLShape,
    point: number[],
    origin: number[],
    direction: number[],
    padding: number,
    anywhere: boolean
  ): { point: number[]; distance: number } | undefined {
    return undefined
  }

  create(props: { id: string } & Partial<T>): T {
    this.refMap.set(props.id, React.createRef<E>())
    return { ...this.defaultProps, ...props }
  }

  mutate(shape: T, props: Partial<T>): T {
    return { ...shape, ...props }
  }

  transform(shape: T, bounds: TLBounds, info: TLTransformInfo<T>): Partial<T> | void {
    return undefined
  }

  transformSingle(shape: T, bounds: TLBounds, info: TLTransformInfo<T>): Partial<T> | void {
    return this.transform(shape, bounds, info)
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
    center: number[]
  ): Partial<T> | void {
    return undefined
  }

  onHandleChange(
    shape: T,
    handle: Partial<T['handles']>,
    info: Partial<TLPointerInfo>
  ): Partial<T> | void {
    return
  }

  onRightPointHandle(
    shape: T,
    handle: Partial<T['handles']>,
    info: Partial<TLPointerInfo>
  ): Partial<T> | void {
    return
  }

  onDoubleClickHandle(
    shape: T,
    handle: Partial<T['handles']>,
    info: Partial<TLPointerInfo>
  ): Partial<T> | void {
    return
  }

  onSessionComplete(shape: T): Partial<T> | void {
    return
  }

  onBoundsReset(shape: T): Partial<T> | void {
    return
  }

  onStyleChange(shape: T): Partial<T> | void {
    return
  }

  hitTest(shape: T, point: number[]) {
    const bounds = this.getBounds(shape)
    return !(
      point[0] < bounds.minX ||
      point[0] > bounds.maxX ||
      point[1] < bounds.minY ||
      point[1] > bounds.maxY
    )
  }

  hitTestBounds(shape: T, bounds: TLBounds) {
    const { minX, minY, maxX, maxY, width, height } = this.getBounds(shape)
    const center = [minX + width / 2, minY + height / 2]

    const corners = [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
    ].map((point) => Vec.rotWith(point, center, shape.rotation || 0))

    return (
      corners.every(
        (point) =>
          !(
            point[0] < bounds.minX ||
            point[0] > bounds.maxX ||
            point[1] < bounds.minY ||
            point[1] > bounds.maxY
          )
      ) || intersectPolylineBounds(corners, bounds).length > 0
    )
  }
}

/* -------------------- Internal -------------------- */

export interface IShapeTreeNode<T extends TLShape, M extends Record<string, unknown>> {
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

/** @internal */
export type MappedByType<T extends { type: string }> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [P in T['type']]: T extends any ? (P extends T['type'] ? T : never) : never
}

/** @internal */
export type RequiredKeys<T> = {
  [K in keyof T]-?: Record<string, unknown> extends Pick<T, K> ? never : K
}[keyof T]
