/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { TLNuBounds, TLNuShape, SVGContainer } from '@tldraw/next'
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

  Component = observer(
    ({
      isHovered,
    }: {
      isEditing: boolean
      isBinding: boolean
      isHovered: boolean
      isSelected: boolean
      meta: any
    }) => {
      return (
        <SVGContainer>
          <rect
            x={this.point[0]}
            y={this.point[1]}
            width={this.size[0]}
            height={this.size[1]}
            fill="black"
          />
        </SVGContainer>
      )
    }
  )

  Indicator: (props: {
    shape: TLNuShape
    isEditing: boolean
    isBinding: boolean
    isHovered: boolean
    isSelected: boolean
    meta: any
  }) => React.ReactElement | null = () => {
    return (
      <SVGContainer>
        <rect
          x={this.point[0]}
          y={this.point[1]}
          width={this.size[0]}
          height={this.size[1]}
          stroke="aqua"
          strokeWidth={2}
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
