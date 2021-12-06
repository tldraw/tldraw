import { computed, makeObservable, observable } from 'mobx'
import { TLNuResizeInfo, TLNuShape, TLNuShapeProps } from '~nu-lib'
import type { TLNuBounds } from '~types'
import { BoundsUtils } from '~utils'

export interface TLNuBoxShapeProps {
  size: number[]
  padding: number
}

export abstract class TLNuBoxShape<P extends TLNuBoxShapeProps> extends TLNuShape<P> {
  constructor(props = {} as TLNuShapeProps & Partial<P>) {
    super(props)
    const { size = [100, 100] } = props
    this.size = size
    makeObservable(this)
  }

  static id = 'box'

  @observable size: number[]

  @computed get bounds(): TLNuBounds {
    const [x, y] = this.point
    const [width, height] = this.size
    return {
      minX: x,
      minY: y,
      maxX: x + width,
      maxY: y + height,
      width,
      height,
    }
  }

  @computed get rotatedBounds(): TLNuBounds {
    return BoundsUtils.getBoundsFromPoints(
      BoundsUtils.getRotatedCorners(this.bounds, this.rotation)
    )
  }

  resize = (bounds: TLNuBounds, info: TLNuResizeInfo<P>) => {
    this.update({
      point: [bounds.minX, bounds.minY],
      size: [Math.max(1, bounds.width), Math.max(1, bounds.height)],
    })
  }
}
