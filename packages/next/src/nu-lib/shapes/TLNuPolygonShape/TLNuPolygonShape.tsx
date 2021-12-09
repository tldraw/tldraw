import * as React from 'react'
import { Vec } from '@tldraw/vec'
import { computed, makeObservable, observable } from 'mobx'
import { observer } from 'mobx-react-lite'
import { SVGContainer } from '~components'
import { BoundsUtils, PointUtils, PolygonUtils } from '~utils'
import { TLNuBoxShape, TLNuBoxShapeProps } from '../TLNuBoxShape'
import type {
  TLNuResizeInfo,
  TLNuComponentProps,
  TLNuIndicatorProps,
  TLNuShapeProps,
} from '~nu-lib'
import type { TLNuBounds } from '~types'
import { intersectLineSegmentPolyline, intersectPolygonBounds } from '@tldraw/intersect'

export interface TLNuPolygonShapeProps extends TLNuBoxShapeProps {
  sides: number
  ratio: number
  isFlippedY: boolean
}

export class TLNuPolygonShape<P extends TLNuPolygonShapeProps = any> extends TLNuBoxShape<P> {
  constructor(props = {} as TLNuShapeProps & Partial<P>) {
    super(props)
    this.init(props)
    makeObservable(this)
  }

  @observable sides = 3
  @observable ratio = 1
  @observable isFlippedY = false

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
    const { ratio, sides, size, isFlippedY } = this
    const [w, h] = size

    if (sides === 3) {
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

    const vertices = PolygonUtils.getPolygonVertices(
      Vec.div([w, h], 2),
      [Math.max(1, w - padding), Math.max(1, h - padding)],
      Math.round(sides),
      ratio
    )

    if (isFlippedY) {
      return vertices.map((point) => [point[0], h - point[1]])
    }

    return vertices
  }

  initialFlipped = this.isFlippedY

  onResizeStart = () => {
    this.initialFlipped = this.isFlippedY
  }

  onResize = (bounds: TLNuBounds, info: TLNuResizeInfo<P>) => {
    const { initialFlipped } = this
    return this.update({
      point: [bounds.minX, bounds.minY],
      size: [Math.max(1, bounds.width), Math.max(1, bounds.height)],
      isFlippedY: info.scaleY < 0 ? !initialFlipped : initialFlipped,
    })
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
