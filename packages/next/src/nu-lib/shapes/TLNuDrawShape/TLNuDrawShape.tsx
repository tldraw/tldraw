import * as React from 'react'
import { Vec } from '@tldraw/vec'
import { computed, makeObservable, observable } from 'mobx'
import {
  TLNuComponentProps,
  TLNuIndicatorProps,
  TLNuResizeInfo,
  TLNuShape,
  TLNuShapeProps,
} from '~nu-lib'
import { BoundsUtils } from '~utils'
import type { TLNuBounds } from '~types'
import { observer } from 'mobx-react-lite'
import { SVGContainer } from '~components'

export interface TLNuDrawShapeProps {
  points: number[][]
}

export class TLNuDrawShape<P extends TLNuDrawShapeProps> extends TLNuShape<P> {
  constructor(props = {} as TLNuShapeProps & Partial<P>) {
    super(props)
    this.init(props)
    makeObservable(this)
  }

  static id = 'draw'

  @observable points: number[][] = []

  Component = observer(({ events }: TLNuComponentProps) => {
    const { points } = this

    return (
      <SVGContainer {...events}>
        <polyline
          points={points.join()}
          stroke={'#000'}
          fill={'none'}
          strokeWidth={2}
          pointerEvents="all"
        />
      </SVGContainer>
    )
  })

  Indicator = observer((props: TLNuIndicatorProps) => {
    const { points } = this
    return (
      <polyline
        className="nu-indicator"
        points={points.join()}
        strokeWidth={2}
        fill="transparent"
      />
    )
  })

  /**
   * The shape's bounds in "shape space".
   */
  @computed get pointBounds(): TLNuBounds {
    const { points } = this
    return BoundsUtils.getBoundsFromPoints(points)
  }

  /**
   * The shape's bounds in "page space".
   */
  @computed get bounds(): TLNuBounds {
    const { pointBounds, point } = this
    return BoundsUtils.translateBounds(pointBounds, point)
  }

  /**
   * The shape's rotated points in "shape space".
   */
  @computed get rotatedPoints(): number[][] {
    const { points, center, rotation } = this
    if (!this.rotation) return points
    return points.map((point) => Vec.rotWith(point, center, rotation))
  }

  /**
   * The shape's rotated bounds in "page space".
   */
  @computed get rotatedBounds(): TLNuBounds {
    const { rotatedPoints } = this
    if (!this.rotation) return this.bounds
    return BoundsUtils.translateBounds(BoundsUtils.getBoundsFromPoints(rotatedPoints), this.point)
  }

  /**
   * A snapshot of the shape's points normalized against its bounds. For
   * performance and memory reasons, this property must be set manually
   * with `setNormalizedPoints`.
   */
  normalizedPoints: number[][] = []

  /**
   * Update the snapshot of the shape's points normalized against its bounds.
   */
  setNormalizedPoints = (): this => {
    const {
      points,
      pointBounds: { width, height },
    } = this
    const size = [width, height]
    this.normalizedPoints = points.map((point) => Vec.divV(point, size))
    return this
  }

  /**
   * Resize the shape to fit a new bounding box.
   * @param bounds
   * @param info
   */
  resize = (bounds: TLNuBounds, info: TLNuResizeInfo<P>) => {
    const { normalizedPoints } = this
    const size = [bounds.width, bounds.height]
    this.update({
      point: [bounds.minX, bounds.minY],
      points: normalizedPoints.map((point) => Vec.mulV(point, size)),
    })
    return this
  }
}
