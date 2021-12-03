/* eslint-disable @typescript-eslint/no-explicit-any */
import { TLNuBounds, TLNuShape, TLNuShapeProps, BoundsUtils } from '@tldraw/next'
import { observable, makeObservable, computed } from 'mobx'

export interface NuBaseShapeProps extends TLNuShapeProps {
  strokeWidth: number
  stroke: string
  fill: string
}

export abstract class NuBaseShape<P extends NuBaseShapeProps> extends TLNuShape<P> {
  constructor(props = {} as P) {
    super(props)
    const { stroke = '#000000', fill = '#ffffffcc', strokeWidth = 2 } = props
    this.stroke = stroke
    this.fill = fill
    this.strokeWidth = strokeWidth
    makeObservable(this)
  }

  @observable stroke: string
  @observable fill: string
  @observable strokeWidth: number

  @computed get rotatedBounds(): TLNuBounds {
    return BoundsUtils.getBoundsFromPoints(
      BoundsUtils.getRotatedCorners(this.bounds, this.rotation)
    )
  }
}
