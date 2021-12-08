/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  SVGContainer,
  TLNuComponentProps,
  TLNuBoxShape,
  TLNuShapeProps,
  TLNuBoxShapeProps,
} from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { makeObservable, observable } from 'mobx'
import type { NuStyleProps } from './NuStyleProps'
import type { NuApp } from 'stores'

export interface NuBoxShapeProps extends TLNuBoxShapeProps, NuStyleProps {}

export class NuBoxShape extends TLNuBoxShape<NuBoxShapeProps> {
  constructor(app: NuApp, props = {} as TLNuShapeProps & Partial<NuBoxShapeProps>) {
    super(app, props)
    this.init(props)
    makeObservable(this)
  }

  static id = 'box'

  @observable stroke = '#000000'
  @observable fill = '#ffffff22'
  @observable strokeWidth = 2

  Component = observer(({ events, isSelected }: TLNuComponentProps) => {
    const {
      size: [w, h],
      stroke,
      fill,
      strokeWidth,
    } = this

    return (
      <SVGContainer {...events}>
        <rect
          className={isSelected ? 'nu-hitarea-fill' : 'nu-hitarea-stroke'}
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={Math.max(0.01, w - strokeWidth)}
          height={Math.max(0.01, h - strokeWidth)}
          pointerEvents="all"
        />
        <rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={Math.max(0.01, w - strokeWidth)}
          height={Math.max(0.01, h - strokeWidth)}
          strokeWidth={strokeWidth}
          stroke={stroke}
          fill={fill}
        />
      </SVGContainer>
    )
  })
}
