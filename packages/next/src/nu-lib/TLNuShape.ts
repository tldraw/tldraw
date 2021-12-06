/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  intersectLineSegmentBounds,
  intersectLineSegmentPolyline,
  intersectPolylineBounds,
} from '@tldraw/intersect'
import { action, computed, makeObservable, observable } from 'mobx'
import type { AnyObject, TLNuBounds, TLNuBoundsCorner, TLNuBoundsEdge, TLNuHandle } from '~types'
import { isPlainObject, BoundsUtils, PointUtils } from '~utils'
import { deepCopy } from '~utils/DataUtils'

export interface TLNuShapeClass<S extends TLNuShape> {
  new (props: any): S
  id: string
}

export interface TLNuIndicatorProps<M = unknown> {
  meta: M
  isEditing: boolean
  isBinding: boolean
  isHovered: boolean
  isSelected: boolean
}

export interface TLNuShapeProps {
  id: string
  parentId: string
  point: number[]
  rotation?: number
  name?: string
  children?: string[]
  handles?: Record<string, TLNuHandle>
  isGhost?: boolean
  isHidden?: boolean
  isLocked?: boolean
  isGenerated?: boolean
  isAspectRatioLocked?: boolean
}

const serializableTypes = new Set(['string', 'number', 'boolean', 'undefined'])

function isSerializable(value: any): boolean {
  if (serializableTypes.has(typeof value) || value === null) return true
  if (Array.isArray(value)) return value.every(isSerializable)
  if (isPlainObject(value)) return Object.values(value).every(isSerializable)
  return false
}

export type TLNuSerializedShape<P = AnyObject> = TLNuShapeProps & {
  type: string
  nonce?: number
} & P

export interface TLNuComponentProps<M = unknown> extends TLNuIndicatorProps<M> {
  events: {
    onPointerMove: React.PointerEventHandler
    onPointerDown: React.PointerEventHandler
    onPointerUp: React.PointerEventHandler
    onPointerEnter: React.PointerEventHandler
    onPointerLeave: React.PointerEventHandler
    onKeyUp: React.KeyboardEventHandler
    onKeyDown: React.KeyboardEventHandler
  }
}

export interface TLNuResizeInfo<P extends AnyObject = any> {
  type: TLNuBoundsEdge | TLNuBoundsCorner
  scaleX: number
  scaleY: number
  transformOrigin: number[]
  initialProps: TLNuShapeProps & P
}

export abstract class TLNuShape<P extends AnyObject = any, M = unknown> implements TLNuShapeProps {
  constructor(props: TLNuShapeProps & Partial<P>) {
    const {
      id,
      parentId,
      name,
      point,
      rotation,
      children,
      handles,
      isGhost,
      isHidden,
      isLocked,
      isGenerated,
      isAspectRatioLocked,
    } = props

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.type = this.constructor['id']
    this.id = id
    this.parentId = parentId
    this.name = name
    this.point = point
    this.rotation = rotation
    this.children = children
    this.handles = handles
    this.isGhost = isGhost
    this.isHidden = isHidden
    this.isLocked = isLocked
    this.isGenerated = isGenerated
    this.isAspectRatioLocked = isAspectRatioLocked

    makeObservable(this)
  }

  static type: string

  type: string

  readonly showCloneHandles = false
  readonly hideBounds = false
  readonly isStateful = false

  readonly id: string

  @observable parentId: string
  @observable point: number[]
  @observable name?: string
  @observable rotation?: number
  @observable children?: string[]
  @observable handles?: Record<string, TLNuHandle>
  @observable isGhost?: boolean
  @observable isHidden?: boolean
  @observable isLocked?: boolean
  @observable isGenerated?: boolean
  @observable isAspectRatioLocked?: boolean

  abstract readonly Component: (props: TLNuComponentProps<M>) => JSX.Element | null

  abstract readonly Indicator: (props: TLNuIndicatorProps<M>) => JSX.Element | null

  abstract get bounds(): TLNuBounds

  abstract get rotatedBounds(): TLNuBounds

  hitTestPoint = (point: number[]): boolean => {
    const ownBounds = this.bounds

    if (!this.rotation) {
      return PointUtils.pointInBounds(point, ownBounds)
    }

    const corners = BoundsUtils.getRotatedCorners(ownBounds, this.rotation)

    return PointUtils.pointInPolygon(point, corners)
  }

  hitTestLineSegment = (A: number[], B: number[]): boolean => {
    const box = BoundsUtils.getBoundsFromPoints([A, B])
    const { bounds, rotation = 0 } = this

    return BoundsUtils.boundsContain(bounds, box) || rotation
      ? intersectLineSegmentPolyline(A, B, BoundsUtils.getRotatedCorners(this.bounds)).didIntersect
      : intersectLineSegmentBounds(A, B, this.bounds).length > 0
  }

  hitTestBounds = (bounds: TLNuBounds): boolean => {
    const ownBounds = this.bounds

    if (!this.rotation) {
      return (
        BoundsUtils.boundsContain(bounds, ownBounds) ||
        BoundsUtils.boundsContain(ownBounds, bounds) ||
        BoundsUtils.boundsCollide(ownBounds, bounds)
      )
    }

    const corners = BoundsUtils.getRotatedCorners(ownBounds, this.rotation)

    return (
      corners.every((point) => PointUtils.pointInBounds(point, bounds)) ||
      intersectPolylineBounds(corners, bounds).length > 0
    )
  }

  resize = (bounds: TLNuBounds, info: TLNuResizeInfo<P>) => {
    this.update({ point: [bounds.minX, bounds.minY] })
  }

  @computed get center(): number[] {
    return BoundsUtils.getBoundsCenter(this.bounds)
  }

  @action update(props: Partial<TLNuShapeProps | P>) {
    Object.assign(this, props)
    if (!('nonce' in props)) this.bump()
  }

  @computed get serialized(): TLNuSerializedShape<P> {
    return deepCopy(
      Object.fromEntries(Object.entries(this).filter(([_key, value]) => isSerializable(value)))
    ) as TLNuSerializedShape<P>
  }

  nonce = 0

  protected bump() {
    this.nonce++
  }

  get shapeId(): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this.constructor['id']
  }

  set shapeId(type: string) {
    // noop, but easier if this exists
  }
}
