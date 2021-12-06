/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  SVGContainer,
  TLNuIndicatorProps,
  TLNuComponentProps,
  TLNuPolygonShape,
  TLNuPolygonShapeProps,
  TLNuShapeProps,
} from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { makeObservable, observable } from 'mobx'
import type { NuStyleProps } from './NuStyleProps'

interface NuPolygonShapeProps extends NuStyleProps, TLNuPolygonShapeProps {}

export class NuPolygonShape extends TLNuPolygonShape<NuPolygonShapeProps> {
  constructor(props = {} as TLNuShapeProps & Partial<NuPolygonShapeProps>) {
    super(props)
    this.init(props)
    makeObservable(this)
  }

  @observable stroke = '#000000'
  @observable fill = '#ffffff22'
  @observable strokeWidth = 2

  static id = 'polygon'

  Component = observer(({ events }: TLNuComponentProps) => {
    const {
      offset: [x, y],
      stroke,
      fill,
      strokeWidth,
    } = this

    return (
      <SVGContainer {...events}>
        <polygon
          transform={`translate(${x}, ${y})`}
          points={this.getVertices(strokeWidth / 2).join()}
          stroke={stroke}
          fill={fill}
          strokeWidth={strokeWidth}
          pointerEvents="all"
        />
      </SVGContainer>
    )
  })

  Indicator = observer((props: TLNuIndicatorProps) => {
    const {
      offset: [x, y],
      strokeWidth,
    } = this

    return (
      <polygon
        className="nu-indicator"
        transform={`translate(${x}, ${y})`}
        points={this.getVertices(strokeWidth / 2).join()}
      />
    )
  })
}
