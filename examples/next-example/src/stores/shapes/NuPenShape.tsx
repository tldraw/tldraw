/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { getStroke } from 'perfect-freehand'
import {
  SVGContainer,
  TLNuComponentProps,
  TLNuDrawShape,
  TLNuDrawShapeProps,
  TLNuIndicatorProps,
  TLNuShapeProps,
} from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { observable, computed, makeObservable } from 'mobx'
import type { NuStyleProps } from './NuStyleProps'

export interface NuPenShapeProps extends TLNuDrawShapeProps, NuStyleProps {}

export class NuPenShape extends TLNuDrawShape<NuPenShapeProps> {
  constructor(props = {} as TLNuShapeProps & Partial<NuPenShapeProps>) {
    super(props)
    this.init(props)
    makeObservable(this)
  }

  static id = 'draw'

  @observable stroke = '#000000'
  @observable fill = '#ffffff22'
  @observable strokeWidth = 2

  // @computed get pointsPath() {
  //   const { points } = this
  //   return points.join()
  // }

  @computed get pointsPath() {
    const { points } = this

    if (points.length < 2) {
      return ''
    }

    const stroke = getStroke(points, {
      size: 8,
    })

    if (!stroke.length) return ''

    const d = stroke.reduce(
      (acc, [x0, y0], i, arr) => {
        const [x1, y1] = arr[(i + 1) % arr.length]
        acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
        return acc
      },
      ['M', ...stroke[0], 'Q']
    )

    d.push('Z')
    return d.join(' ')
  }

  Component = observer(({ events }: TLNuComponentProps) => {
    const { pointsPath, stroke, fill, strokeWidth } = this

    return (
      <SVGContainer {...events}>
        <path
          d={pointsPath}
          stroke={stroke}
          fill={stroke}
          strokeWidth={strokeWidth}
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
