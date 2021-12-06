/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { TLNuBoxTool, TLNuToolComponentProps } from '@tldraw/next'
import { NuPolygonShape, Shape } from 'stores'

export class NuPolygonTool extends TLNuBoxTool<Shape> {
  shapeClass = NuPolygonShape
  static id = 'polygon'
  static shortcut = '4'
  readonly label = 'Polygon'

  readonly Component = ({ isActive }: TLNuToolComponentProps) => {
    return <span style={{ fontWeight: isActive ? '600' : '500' }}>P</span>
  }
}
