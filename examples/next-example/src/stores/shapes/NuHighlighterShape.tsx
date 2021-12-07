/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  SVGContainer,
  SvgPathUtils,
  TLNuComponentProps,
  TLNuDrawShape,
  TLNuDrawShapeProps,
  TLNuIndicatorProps,
  TLNuShapeProps,
} from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { observable, computed, makeObservable } from 'mobx'
import type { NuStyleProps } from './NuStyleProps'
import type { NuApp } from 'stores'

export interface NuHighlighterShapeProps extends TLNuDrawShapeProps, NuStyleProps {}

export class NuHighlighterShape extends TLNuDrawShape<NuHighlighterShapeProps> {
  constructor(app: NuApp, props = {} as TLNuShapeProps & Partial<NuHighlighterShapeProps>) {
    super(app, props)
    this.init(props)
    makeObservable(this)
  }

  static id = 'highlighter'

  @observable stroke = '#000000'
  @observable fill = '#ffffff22'
  @observable strokeWidth = 2

  @computed get pointsPath() {
    const { points } = this
    return SvgPathUtils.getCurvedPathForPoints(points)
  }

  Component = observer(({ events }: TLNuComponentProps) => {
    const { pointsPath, stroke, fill, strokeWidth } = this

    return (
      <SVGContainer {...events}>
        <path
          d={pointsPath}
          stroke={stroke}
          fill={fill}
          strokeWidth={strokeWidth * 16}
          pointerEvents="all"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.17}
        />
      </SVGContainer>
    )
  })

  Indicator = observer((props: TLNuIndicatorProps) => {
    const { pointsPath } = this
    return <path d={pointsPath} fill="none" />
  })
}
