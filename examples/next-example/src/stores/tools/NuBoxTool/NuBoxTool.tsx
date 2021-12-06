/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { TLNuBoxTool, TLNuToolComponentProps } from '@tldraw/next'
import { NuBoxShape } from 'stores'

export class NuBoxTool extends TLNuBoxTool<NuBoxShape> {
  static id = 'box'
  shortcut = 'b,r,2'
  shapeClass = NuBoxShape
  label = 'Box'

  readonly Component = ({ isActive }: TLNuToolComponentProps) => {
    return <span style={{ fontWeight: isActive ? '600' : '500' }}>B</span>
  }
}
