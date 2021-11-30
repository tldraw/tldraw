/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  TLNuBounds,
  SVGContainer,
  TLNuShape,
  TLNuShapeProps,
  TLNuIndicatorProps,
  TLNuComponentProps,
  TLNuResizeInfo,
} from '@tldraw/next'
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
      <rect
        width={this.size[0]}
        height={this.size[1]}
        stroke="dodgerblue"
        strokeWidth={2}
        fill="transparent"
      />
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

  resize = (bounds: TLNuBounds, info: TLNuResizeInfo<NuBoxShapeProps>) => {
    this.update({
      point: [bounds.minX, bounds.minY],
      size: [Math.max(1, bounds.width), Math.max(1, bounds.height)],
    })
  }
}
