import { computed, makeObservable, observable } from 'mobx'
import { TLNuResizeInfo, TLNuShape, TLNuShapeProps } from '~nu-lib'
import type { TLNuBounds } from '~types'

export interface TLNuBoxShapeProps {
  size: number[]
}

export abstract class TLNuBoxShape extends TLNuShape<TLNuBoxShapeProps> {
  constructor(props = {} as TLNuShapeProps & Partial<TLNuBoxShapeProps>) {
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

  resize = (bounds: TLNuBounds, info: TLNuResizeInfo<TLNuBoxShapeProps>) => {
    this.update({
      point: [bounds.minX, bounds.minY],
      size: [Math.max(1, bounds.width), Math.max(1, bounds.height)],
    })
  }
}
