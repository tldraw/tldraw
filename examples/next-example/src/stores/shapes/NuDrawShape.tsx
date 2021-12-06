/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  SVGContainer,
  TLNuComponentProps,
  TLNuDrawShape,
  TLNuDrawShapeProps,
  TLNuShapeProps,
} from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { observable, computed, makeObservable } from 'mobx'
import type { NuStyleProps } from './NuStyleProps'

export interface NuDrawShapeProps extends TLNuDrawShapeProps, NuStyleProps {}

export class NuDrawShape extends TLNuDrawShape<NuDrawShapeProps> {
  constructor(props = {} as TLNuShapeProps & Partial<NuDrawShapeProps>) {
    super(props)
    this.init(props)
    makeObservable(this)
  }

  static id = 'draw'

  @observable stroke = '#000000'
  @observable fill = '#ffffff22'
  @observable strokeWidth = 2

  @computed get pointsPath() {
    const { points } = this
    return points.join()
  }

  Component = observer(({ events }: TLNuComponentProps) => {
    const { pointsPath, stroke, fill, strokeWidth } = this

    return (
      <SVGContainer {...events}>
        <polyline
          points={pointsPath}
          stroke={stroke}
          fill={fill}
          strokeWidth={strokeWidth}
          pointerEvents="all"
        />
      </SVGContainer>
    )
  })
}
