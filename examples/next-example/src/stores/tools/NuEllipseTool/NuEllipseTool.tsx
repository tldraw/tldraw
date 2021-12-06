/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { TLNuBoxTool, TLNuToolComponentProps } from '@tldraw/next'
import { NuEllipseShape } from 'stores'

export class NuEllipseTool extends TLNuBoxTool<NuEllipseShape> {
  shapeClass = NuEllipseShape
  static id = 'ellipse'
  static shortcut = '3'
  readonly label = 'Ellipse'

  readonly Component = ({ isActive }: TLNuToolComponentProps) => {
    return <span style={{ fontWeight: isActive ? '600' : '500' }}>O</span>
  }
}
