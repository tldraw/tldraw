/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { TLNuApp, TLNuTool, TLNuToolComponentProps } from '@tldraw/next'
import type { NuPolygonShape } from 'stores'
import { IdleState, PointingState, CreatingState } from './states'

export class NuPolygonTool extends TLNuTool<NuPolygonShape> {
  constructor(app: TLNuApp<NuPolygonShape>) {
    super(app)
    this.registerStates(IdleState, PointingState, CreatingState)
    this.transition('idle')
  }

  static id = 'box'
  static shortcut = '2'

  readonly label = 'Box'

  readonly Component = ({ isActive }: TLNuToolComponentProps) => {
    return <span style={{ fontWeight: isActive ? '600' : '500' }}>B</span>
  }

  onEnter = () => this.transition('idle')
}
