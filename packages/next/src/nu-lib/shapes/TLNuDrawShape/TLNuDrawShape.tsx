import * as React from 'react'
import { Vec } from '@tldraw/vec'
import { computed, makeObservable, observable } from 'mobx'
import { TLNuShape, TLNuShapeProps } from '~nu-lib/TLNuShape'
import { BoundsUtils } from '~utils'
import { observer } from 'mobx-react-lite'
import { SVGContainer } from '~components'
import type { TLNuBounds } from '~types'
import type { TLNuComponentProps, TLNuIndicatorProps, TLNuResizeInfo } from '~nu-lib'

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
  @observable isComplete = false

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
  getBounds = (): TLNuBounds => {
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
  getRotatedBounds = (): TLNuBounds => {
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
  isResizeFlippedX = false
  isResizeFlippedY = false

  /**
   * Prepare the shape for a resize session.
   */
  onResizeStart = () => {
    const { bounds, points } = this
    const size = [bounds.width, bounds.height]
    this.normalizedPoints = points.map((point) => Vec.divV(point, size))
  }

  /**
   * Resize the shape to fit a new bounding box.
   * @param bounds
   * @param info
   */
  onResize = (bounds: TLNuBounds, info: TLNuResizeInfo<P>) => {
    const size = [bounds.width, bounds.height]
    const flipX = info.scaleX < 0
    const flipY = info.scaleY < 0

    this.update({
      point: [bounds.minX, bounds.minY],
      points: this.normalizedPoints.map((point) => {
        if (flipX) point = [1 - point[0], point[1]]
        if (flipY) point = [point[0], 1 - point[1]]
        return Vec.mulV(point, size).concat(point[2])
      }),
    })
    return this
  }
}
