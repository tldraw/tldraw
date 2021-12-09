/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  SVGContainer,
  TLNuIndicatorProps,
  TLNuComponentProps,
  TLNuStarShape,
  TLNuStarShapeProps,
  TLNuShapeProps,
  assignOwnProps,
} from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { makeObservable, observable } from 'mobx'
import type { NuStyleProps } from './NuStyleProps'

interface NuStarShapeProps extends NuStyleProps, TLNuStarShapeProps {}

export class NuStarShape extends TLNuStarShape<NuStarShapeProps> {
  constructor(props = {} as TLNuShapeProps & Partial<NuStarShapeProps>) {
    super(props)
    assignOwnProps(this, props)
    makeObservable(this)
  }

  @observable stroke = '#000000'
  @observable fill = '#ffffff22'
  @observable strokeWidth = 2

  static id = 'star'

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
          strokeLinecap="round"
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
        transform={`translate(${x}, ${y})`}
        points={this.getVertices(strokeWidth / 2).join()}
      />
    )
  })
}
