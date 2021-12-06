/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { TLNuDrawTool, TLNuToolComponentProps } from '@tldraw/next'
import { NuPenShape } from 'stores'

export class NuDrawTool extends TLNuDrawTool<NuPenShape> {
  static id = 'draw'
  shortcut = 'd,p,5'
  shapeClass = NuPenShape
  label = 'Draw'

  simplify = false

  readonly Component = ({ isActive }: TLNuToolComponentProps) => {
    return <span style={{ fontWeight: isActive ? '600' : '500' }}>D</span>
  }
}
