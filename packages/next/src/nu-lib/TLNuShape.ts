/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  intersectLineSegmentBounds,
  intersectLineSegmentPolyline,
  intersectPolygonBounds,
} from '@tldraw/intersect'
import { action, autorun, computed, isObservable, makeObservable, observable, observe } from 'mobx'
import type {
  TLNuBinding,
  AnyObject,
  TLNuBounds,
  TLNuBoundsCorner,
  TLNuBoundsEdge,
  TLNuHandle,
} from '~types'
import type { TLNuApp } from './TLNuApp'
import { isPlainObject, BoundsUtils, PointUtils, assignOwnProps } from '~utils'
import { deepCopy } from '~utils/DataUtils'
import { observer } from 'mobx-react-lite'

export interface TLNuShapeClass<
  S extends TLNuShape,
  B extends TLNuBinding,
  A extends TLNuApp<S, B> = TLNuApp<S, B>
> {
  new (app: A, props: any): S
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
  initialBounds: TLNuBounds
  initialProps: TLNuShapeProps & P
}

export abstract class TLNuShape<P extends AnyObject = any, M = any> implements TLNuShapeProps {
  constructor(app: TLNuApp<any, any>, props: TLNuShapeProps & Partial<P>) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.type = this.constructor['id']
    this.app = app
    assignOwnProps(this, props)
  }

  static type: string

  readonly app: TLNuApp<any, any>
  readonly showCloneHandles = false
  readonly hideBounds = false
  readonly isStateful = false
  readonly type: string
  readonly id: string = 'id'
  @observable parentId = 'parentId'
  @observable point: number[] = [0, 0]
  @observable name?: string = 'Shape'
  @observable rotation?: number
  @observable children?: string[]
  @observable handles?: Record<string, TLNuHandle>
  @observable isGhost?: boolean
  @observable isHidden?: boolean
  @observable isLocked?: boolean
  @observable isGenerated?: boolean
  @observable isAspectRatioLocked?: boolean

  abstract Component: (props: TLNuComponentProps<M>) => JSX.Element | null
  abstract Indicator: (props: TLNuIndicatorProps<M>) => JSX.Element | null

  protected init = (props: TLNuShapeProps & Partial<P>) => {
    assignOwnProps(this, props)
    this.lastSerialized = this.getSerialized()
    makeObservable(this)
  }

  abstract getBounds: () => TLNuBounds

  getCenter = () => {
    return BoundsUtils.getBoundsCenter(this.bounds)
  }

  getRotatedBounds = () => {
    const { bounds, rotation } = this
    if (!rotation) return bounds
    return BoundsUtils.getBoundsFromPoints(BoundsUtils.getRotatedCorners(bounds, rotation))
  }

  hitTestPoint = (point: number[]): boolean => {
    const ownBounds = this.rotatedBounds

    if (!this.rotation) {
      return PointUtils.pointInBounds(point, ownBounds)
    }

    const corners = BoundsUtils.getRotatedCorners(ownBounds, this.rotation)

    return PointUtils.pointInPolygon(point, corners)
  }

  hitTestLineSegment = (A: number[], B: number[]): boolean => {
    const box = BoundsUtils.getBoundsFromPoints([A, B])
    const { rotatedBounds, rotation = 0 } = this

    return BoundsUtils.boundsContain(rotatedBounds, box) || rotation
      ? intersectLineSegmentPolyline(A, B, BoundsUtils.getRotatedCorners(this.bounds)).didIntersect
      : intersectLineSegmentBounds(A, B, rotatedBounds).length > 0
  }

  hitTestBounds = (bounds: TLNuBounds): boolean => {
    const { rotatedBounds } = this

    if (!this.rotation) {
      return (
        BoundsUtils.boundsContain(bounds, rotatedBounds) ||
        BoundsUtils.boundsContain(rotatedBounds, bounds) ||
        BoundsUtils.boundsCollide(rotatedBounds, bounds)
      )
    }

    const corners = BoundsUtils.getRotatedCorners(this.bounds, this.rotation)

    return (
      BoundsUtils.boundsContain(bounds, rotatedBounds) ||
      intersectPolygonBounds(corners, bounds).length > 0
    )
  }

  onResize = (bounds: TLNuBounds, info: TLNuResizeInfo<P>) => {
    this.update({ point: [bounds.minX, bounds.minY] })
    return this
  }

  onResizeStart?: () => void

  @computed get center(): number[] {
    return this.getCenter()
  }

  @computed get bounds(): TLNuBounds {
    return this.getBounds()
  }

  @computed get rotatedBounds(): TLNuBounds {
    return this.getRotatedBounds()
  }

  /** A version for the shape, incremented each time it is serialized. */
  nonce = 0
  isDirty = true
  lastSerialized = {} as TLNuSerializedShape<P>

  /** Get a serialized version of the shape. */
  getSerialized = (): TLNuSerializedShape<P> => {
    if (this.isDirty) {
      this.nonce++
      this.isDirty = false
      this.lastSerialized = deepCopy(
        Object.fromEntries(Object.entries(this).filter(([_key, value]) => isSerializable(value)))
      ) as TLNuSerializedShape<P>
    }
    return this.lastSerialized
  }

  get serialized(): TLNuSerializedShape<P> {
    return this.getSerialized()
  }

  /**
   * Update the shape with new properties.
   *
   * ```tsx
   * myShape.update({ size: [200, 200] })
   * ```
   *
   * @public
   */
  @action update(props: Partial<TLNuShapeProps | P>, isDeserializing = false) {
    if (!(isDeserializing || this.isDirty)) {
      this.isDirty = true
    }
    Object.assign(this, props)
    return this
  }
}
