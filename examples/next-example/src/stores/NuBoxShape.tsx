/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  TLNuBounds,
  SVGContainer,
  TLNuShape,
  TLNuShapeProps,
  TLNuIndicatorProps,
  TLNuComponentProps,
  BoundsUtils,
} from '@tldraw/next'
import { intersectPolylineBounds } from '@tldraw/intersect'
import { observer } from 'mobx-react-lite'
import { observable, computed, makeObservable } from 'mobx'

export interface NuBoxShapeProps extends TLNuShapeProps {
  size: number[]
}

export class NuBoxShape extends TLNuShape<NuBoxShapeProps> {
  readonly type = 'box'

  @observable size: number[]

  constructor(props = {} as NuBoxShapeProps) {
    super(props)
    const { size = [100, 100] } = props
    this.size = size
    makeObservable(this)
  }

  Component = observer(({ events }: TLNuComponentProps) => {
    return (
      <SVGContainer {...events}>
        <rect
          width={this.size[0]}
          height={this.size[1]}
          strokeWidth={2}
          stroke="black"
          fill="none"
          pointerEvents="all"
        />
      </SVGContainer>
    )
  })

  Indicator = (props: TLNuIndicatorProps) => {
    return (
      <SVGContainer>
        <rect
          width={this.size[0]}
          height={this.size[1]}
          stroke="dodgerblue"
          strokeWidth={2}
          fill="transparent"
        />
      </SVGContainer>
    )
  }

  hitTestBounds = (bounds: TLNuBounds) => {
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
      corners.every((point) => BoundsUtils.pointInBounds(point, bounds)) ||
      intersectPolylineBounds(corners, bounds).length > 0
    )
  }

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
}
