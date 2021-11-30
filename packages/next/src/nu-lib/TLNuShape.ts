/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  intersectLineSegmentBounds,
  intersectLineSegmentPolyline,
  intersectPolylineBounds,
} from '@tldraw/intersect'
import { action, computed, makeObservable, observable } from 'mobx'
import type { TLNuBounds, TLNuHandle } from '~types'
import { BoundsUtils, PointUtils } from '~utils'

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

export abstract class TLNuShape<P extends TLNuShapeProps = TLNuShapeProps, M = unknown>
  implements TLNuShapeProps
{
  abstract readonly type: string

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

  constructor(props = {} as P) {
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

  abstract readonly Component: (props: TLNuComponentProps<M>) => JSX.Element | null

  abstract readonly Indicator: (props: TLNuIndicatorProps<M>) => JSX.Element | null

  abstract get bounds(): TLNuBounds

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

  @computed get center(): number[] {
    return BoundsUtils.getBoundsCenter(this.bounds)
  }

  @action update(props: Partial<P>) {
    Object.assign(this, props)
  }
}
