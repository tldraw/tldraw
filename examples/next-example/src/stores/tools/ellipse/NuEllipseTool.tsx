/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { TLNuApp, TLNuTool, TLNuToolComponentProps } from '@tldraw/next'
import type { Shape } from 'stores'
import { IdleState, PointingState, CreatingState } from './states'

export class NuEllipseTool extends TLNuTool<Shape> {
  constructor(app: TLNuApp<Shape>) {
    super(app)
    this.registerStates(IdleState, PointingState, CreatingState)
  }

  static id = 'ellipse'
  static shortcut = '3'
  readonly label = 'Ellipse'

  readonly Component = ({ isActive }: TLNuToolComponentProps) => {
    return <span style={{ fontWeight: isActive ? '600' : '500' }}>O</span>
  }

  onEnter = () => this.transition('idle')
}
