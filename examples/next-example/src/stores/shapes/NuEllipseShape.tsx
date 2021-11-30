/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  TLNuBounds,
  SVGContainer,
  TLNuShape,
  TLNuShapeProps,
  TLNuIndicatorProps,
  TLNuComponentProps,
  PointUtils,
  BoundsUtils,
  TLNuResizeInfo,
} from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { observable, computed, makeObservable } from 'mobx'
import { intersectEllipseBounds, intersectLineSegmentEllipse } from '@tldraw/intersect'

export interface NuEllipseShapeProps extends TLNuShapeProps {
  size: number[]
}

export class NuEllipseShape extends TLNuShape<NuEllipseShapeProps> {
  readonly type = 'ellipse'

  @observable size: number[]

  constructor(props = {} as NuEllipseShapeProps) {
    super(props)
    const { size = [100, 100] } = props
    this.size = size
    makeObservable(this)
  }

  Component = observer(({ events }: TLNuComponentProps) => {
    return (
      <SVGContainer {...events}>
        <ellipse
          cx={this.size[0] / 2}
          cy={this.size[1] / 2}
          rx={this.size[0] / 2}
          ry={this.size[1] / 2}
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
      <ellipse
        className="nu-indicator"
        cx={this.size[0] / 2}
        cy={this.size[1] / 2}
        rx={this.size[0] / 2}
        ry={this.size[1] / 2}
        strokeWidth={2}
        fill="transparent"
      />
    )
  }

  hitTestPoint = (point: number[]) => {
    return PointUtils.pointInEllipse(
      point,
      this.center,
      this.size[0],
      this.size[1],
      this.rotation || 0
    )
  }

  hitTestLineSegment = (A: number[], B: number[]): boolean => {
    return intersectLineSegmentEllipse(
      A,
      B,
      this.center,
      this.size[0],
      this.size[1],
      this.rotation || 0
    ).didIntersect
  }

  hitTestBounds = (bounds: TLNuBounds): boolean => {
    const shapeBounds = this.bounds

    return (
      BoundsUtils.boundsContained(shapeBounds, bounds) ||
      intersectEllipseBounds(
        this.center,
        this.size[0] / 2,
        this.size[1] / 2,
        this.rotation || 0,
        bounds
      ).length > 0
    )
  }

  @computed get bounds(): TLNuBounds {
    const [x, y] = this.point
    const [width, height] = this.size
    return BoundsUtils.getRotatedEllipseBounds(x, y, width / 2, height / 2, 0)
  }

  @computed get rotatedBounds(): TLNuBounds {
    const [x, y] = this.point
    const [width, height] = this.size
    return BoundsUtils.getRotatedEllipseBounds(x, y, width / 2, height / 2, this.rotation || 0)
  }

  resize = (bounds: TLNuBounds, info: TLNuResizeInfo<NuEllipseShapeProps>) => {
    this.update({
      point: [bounds.minX, bounds.minY],
      size: [Math.max(1, bounds.width), Math.max(1, bounds.height)],
    })
  }
}
