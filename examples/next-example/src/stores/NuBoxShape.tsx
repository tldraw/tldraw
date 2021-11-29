/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  TLNuBounds,
  SVGContainer,
  TLNuShape,
  TLNuShapeProps,
  TLNuIndicatorProps,
} from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { observable, computed, makeObservable } from 'mobx'

export class NuBoxShape extends TLNuShape {
  showCloneHandles = false
  hideBounds = false
  isStateful = false

  id: string
  type = 'box' as const

  @observable parentId: string
  @observable childIndex: number
  @observable name: string
  @observable point: number[]
  @observable size: number[]
  @observable rotation?: number

  constructor(
    props = {} as Partial<{
      id: string
      type: string
      parentId: string
      childIndex: number
      name: string
      point: number[]
      rotation?: number
      size: number[]
    }>
  ) {
    super()

    const {
      id = 'box',
      parentId = 'page',
      childIndex = 1,
      name = 'Box',
      point = [0, 0],
      rotation = 0,
      size = [100, 100],
    } = props

    this.id = id
    this.parentId = parentId
    this.childIndex = childIndex
    this.name = name
    this.point = point
    this.rotation = rotation
    this.size = size

    makeObservable(this)
  }

  Component = observer((props: TLNuShapeProps) => {
    return (
      <SVGContainer>
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
