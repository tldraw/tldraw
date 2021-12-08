/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { getStroke } from 'perfect-freehand'
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

export interface NuPenShapeProps extends TLNuDrawShapeProps, NuStyleProps {}

export class NuPenShape extends TLNuDrawShape<NuPenShapeProps> {
  constructor(app: NuApp, props = {} as TLNuShapeProps & Partial<NuPenShapeProps>) {
    super(app, props)
    this.init(props)
    makeObservable(this)
  }

  static id = 'draw'

  @observable stroke = '#000000'
  @observable fill = '#ffffff22'
  @observable strokeWidth = 2

  @computed get pointsPath() {
    const { points, isComplete } = this
    if (points.length < 2) return ''
    const stroke = getStroke(points, { size: 8, last: isComplete })
    return SvgPathUtils.getCurvedPathForPolygon(stroke)
  }

  Component = observer(({ events }: TLNuComponentProps) => {
    const { pointsPath, stroke, strokeWidth } = this

    return (
      <SVGContainer {...events}>
        <path
          d={pointsPath}
          strokeWidth={strokeWidth}
          stroke={stroke}
          fill={stroke}
          pointerEvents="all"
        />
      </SVGContainer>
    )
  })

  Indicator = observer((props: TLNuIndicatorProps) => {
    const { pointsPath } = this
    return <path className="nu-indicator" d={pointsPath} />
  })
}
