/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  SVGContainer,
  TLNuIndicatorProps,
  TLNuComponentProps,
  TLNuPolygonShape,
  TLNuPolygonShapeProps,
  TLNuShapeProps,
  assignOwnProps,
} from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { makeObservable, observable } from 'mobx'
import type { NuStyleProps } from './NuStyleProps'
import type { NuApp } from 'stores'

interface NuPolygonShapeProps extends NuStyleProps, TLNuPolygonShapeProps {}

export class NuPolygonShape extends TLNuPolygonShape<NuPolygonShapeProps> {
  constructor(app: NuApp, props = {} as TLNuShapeProps & Partial<NuPolygonShapeProps>) {
    super(app, props)
    assignOwnProps(this, props)
    makeObservable(this)
  }

  @observable stroke = '#000000'
  @observable fill = '#ffffff22'
  @observable strokeWidth = 2

  static id = 'polygon'

  Component = observer(({ events, isSelected }: TLNuComponentProps) => {
    const {
      offset: [x, y],
      stroke,
      fill,
      strokeWidth,
    } = this

    const path = this.getVertices(strokeWidth / 2).join()

    return (
      <SVGContainer {...events}>
        <polygon
          className={isSelected ? 'nu-hitarea-fill' : 'nu-hitarea-stroke'}
          transform={`translate(${x}, ${y})`}
          points={path}
        />
        <polygon
          transform={`translate(${x}, ${y})`}
          points={path}
          stroke={stroke}
          fill={fill}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
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
