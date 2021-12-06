/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { TLNuDrawTool, TLNuToolComponentProps } from '@tldraw/next'
import { NuDrawShape } from 'stores'

export class NuDrawTool extends TLNuDrawTool<NuDrawShape> {
  shapeClass = NuDrawShape

  static id = 'draw'
  static shortcut = '5'
  readonly label = 'Draw'

  readonly Component = ({ isActive }: TLNuToolComponentProps) => {
    return <span style={{ fontWeight: isActive ? '600' : '500' }}>D</span>
  }
}
