import * as React from 'react'
import { Vec } from '@tldraw/vec'
import { computed, makeObservable, observable } from 'mobx'
import { observer } from 'mobx-react-lite'
import { SVGContainer } from '~components'
import { BoundsUtils, PointUtils, PolygonUtils } from '~utils'
import { TLNuBoxShape, TLNuBoxShapeProps } from '../TLNuBoxShape'
import { intersectLineSegmentPolyline, intersectPolygonBounds } from '@tldraw/intersect'
import type { TLNuApp, TLNuComponentProps, TLNuIndicatorProps, TLNuShapeProps } from '~nu-lib'
import type { TLNuBounds } from '~types'

export interface TLNuStarShapeProps extends TLNuBoxShapeProps {
  points: number
  ratio: number
}

export class TLNuStarShape<P extends TLNuStarShapeProps> extends TLNuBoxShape<P> {
  constructor(app: TLNuApp<any, any>, props = {} as TLNuShapeProps & Partial<P>) {
    super(app, props)
    this.init(props)
    makeObservable(this)
  }

  @observable points = 3
  @observable ratio = 1

  static id = 'polygon'

  Component = observer(({ events }: TLNuComponentProps) => {
    const {
      offset: [x, y],
    } = this

    return (
      <SVGContainer {...events}>
        <polygon
          transform={`translate(${x}, ${y})`}
          points={this.vertices.join()}
          stroke={'#000'}
          fill={'none'}
          strokeWidth={2}
          pointerEvents="all"
        />
      </SVGContainer>
    )
  })

  Indicator = observer((props: TLNuIndicatorProps) => {
    const {
      offset: [x, y],
    } = this

    return <polygon transform={`translate(${x}, ${y})`} points={this.vertices.join()} />
  })

  @computed get vertices() {
    return this.getVertices()
  }

  @computed get offset() {
    const {
      size: [w, h],
    } = this
    const center = BoundsUtils.getBoundsCenter(BoundsUtils.getBoundsFromPoints(this.vertices))
    return Vec.sub(Vec.div([w, h], 2), center)
  }

  @computed get pageVertices() {
    const { point, vertices } = this
    return vertices.map((vert) => Vec.add(vert, point))
  }

  getVertices(padding = 0): number[][] {
    const {
      ratio,
      points,
      size: [w, h],
    } = this
    if (points === 3) {
      const A = [w / 2, padding / 2]
      const B = [w - padding, h - padding]
      const C = [padding / 2, h - padding]

      const centroid = PolygonUtils.getPolygonCentroid([A, B, C])

      const AB = Vec.med(A, B)
      const BC = Vec.med(B, C)
      const CA = Vec.med(C, A)

      const r = 1 - ratio

      return [
        A,
        Vec.nudge(AB, centroid, Vec.dist(AB, centroid) * r),
        B,
        Vec.nudge(BC, centroid, Vec.dist(BC, centroid) * r),
        C,
        Vec.nudge(CA, centroid, Vec.dist(CA, centroid) * r),
      ]
    }

    return PolygonUtils.getStarVertices(
      Vec.div([w, h], 2),
      [w - padding, h - padding],
      Math.round(points),
      ratio
    )
  }

  hitTestPoint = (point: number[]): boolean => {
    const { vertices } = this
    return PointUtils.pointInPolygon(Vec.add(point, this.point), vertices)
  }

  hitTestLineSegment = (A: number[], B: number[]): boolean => {
    const { vertices, point } = this
    return intersectLineSegmentPolyline(Vec.add(A, point), Vec.add(B, point), vertices).didIntersect
  }

  hitTestBounds = (bounds: TLNuBounds): boolean => {
    const { offset, vertices, point } = this
    return (
      intersectPolygonBounds(
        vertices,
        BoundsUtils.translateBounds(bounds, Vec.neg(Vec.add(point, offset)))
      ).length > 0
    )
  }
}
