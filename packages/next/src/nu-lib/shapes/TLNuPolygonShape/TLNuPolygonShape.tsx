import * as React from 'react'
import { Vec } from '@tldraw/vec'
import { computed, makeObservable, observable } from 'mobx'
import { observer } from 'mobx-react-lite'
import { SVGContainer } from '~components'
import { BoundsUtils, PolygonUtils } from '~utils'
import { TLNuBoxShape, TLNuBoxShapeProps } from '../TLNuBoxShape'
import type { TLNuApp, TLNuComponentProps, TLNuIndicatorProps, TLNuShapeProps } from '~nu-lib'

export interface TLNuPolygonShapeProps extends TLNuBoxShapeProps {
  sides: number
}

export class TLNuPolygonShape<P extends TLNuPolygonShapeProps> extends TLNuBoxShape<P> {
  constructor(app: TLNuApp<any, any>, props = {} as TLNuShapeProps & Partial<P>) {
    super(app, props)
    this.init(props)
    makeObservable(this)
  }

  @observable sides = 3

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

    return (
      <polygon
        className="nu-indicator"
        transform={`translate(${x}, ${y})`}
        points={this.vertices.join()}
      />
    )
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
      sides,
      size: [w, h],
    } = this
    return sides === 3
      ? [
          [w / 2, padding / 2],
          [w - padding, h - padding],
          [padding / 2, h - padding],
        ]
      : PolygonUtils.getPolygonInEllipse(
          Vec.div([w, h], 2),
          w / 2 - padding / 2,
          h / 2 - padding / 2,
          sides
        )
  }
}
