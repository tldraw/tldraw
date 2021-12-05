/* eslint-disable @typescript-eslint/no-explicit-any */
import { intersectLineSegmentPolygon, intersectPolygonBounds } from '@tldraw/intersect'
import Vec from '@tldraw/vec'
import { observable, computed, makeObservable } from 'mobx'
import { TLNuShape, TLNuShapeProps } from '~nu-lib'
import type { TLNuBounds } from '~types'
import { BoundsUtils, PointUtils } from '~utils'

export interface TLNuPolygonShapeProps {
  sides: number
  size: number[]
}

export abstract class TLNuPolygonShape<P extends TLNuPolygonShapeProps> extends TLNuShape<P> {
  constructor(props = {} as TLNuShapeProps & Partial<P>) {
    super(props)
    const { sides = 3, size = [100, 100] } = props
    this.sides = sides
    this.size = size
    makeObservable(this)
  }

  static id = 'polygon'

  @observable sides: number
  @observable size: number[]

  @computed get xyr() {
    const {
      size: [w, h],
    } = this
    return w > h ? [(w - h) / 2, 0, h] : [0, (h - w) / 2, w]
  }

  @computed get vertices() {
    const {
      size: [w, h],
      xyr: [x, y, r],
      sides,
    } = this
    return Array(sides).map((_, i) => [
      Math.cos((i * 2 * Math.PI) / this.sides) * r + x + w / 2,
      Math.cos((i * 2 * Math.PI) / this.sides) * r + y + h / 2,
    ])
  }

  @computed get pageVertices() {
    const { point, vertices } = this
    return vertices.map((vert) => Vec.add(vert, point))
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

  hitTestPoint = (point: number[]) => {
    return PointUtils.pointInPolygon(point, this.vertices)
  }

  hitTestLineSegment = (A: number[], B: number[]): boolean => {
    return intersectLineSegmentPolygon(A, B, this.pageVertices).didIntersect
  }

  hitTestBounds = (bounds: TLNuBounds): boolean => {
    const shapeBounds = this.bounds

    return (
      BoundsUtils.boundsContained(shapeBounds, bounds) ||
      intersectPolygonBounds(this.pageVertices, bounds).length > 0
    )
  }
}
