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
import { observable, makeObservable, action } from 'mobx'
import type { NuBaseShapeProps } from './NuBaseShape'

interface NuPolygonShapeProps extends NuBaseShapeProps, TLNuPolygonShapeProps {}

export class NuPolygonShape extends TLNuPolygonShape<NuPolygonShapeProps> {
  constructor(props = {} as TLNuShapeProps & Partial<NuPolygonShapeProps>) {
    super(props)
    const { stroke = '#000000', fill = '#ffffffcc', strokeWidth = 2 } = props
    this.stroke = stroke
    this.fill = fill
    this.strokeWidth = strokeWidth
    makeObservable(this)
  }

  @observable stroke: string
  @observable fill: string
  @observable strokeWidth: number

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

  Indicator = (props: TLNuIndicatorProps) => {
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
  }
}
