/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { TLNuApp, TLNuState, TLNuTool, TLNuToolComponentProps } from '@tldraw/next'
import type { Shape } from 'stores'
import { IdleState, PointingState, CreatingState } from './states'
import { makeObservable, observable } from 'mobx'

export class NuBoxTool extends TLNuTool<Shape> {
  constructor(app: TLNuApp<Shape>) {
    super(app)
    makeObservable(this)
  }

  readonly id = 'box'

  readonly label = 'Box'

  readonly shortcut = '2'

  readonly Component = ({ isActive }: TLNuToolComponentProps) => {
    return <span style={{ fontWeight: isActive ? '600' : '500' }}>B</span>
  }

  readonly states: TLNuState<Shape>[] = [
    new IdleState(this),
    new PointingState(this),
    new CreatingState(this),
  ]

  @observable currentState = this.states[0]

  onEnter = () => this.transition('idle')
}
