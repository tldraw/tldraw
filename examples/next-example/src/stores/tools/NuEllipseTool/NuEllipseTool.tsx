import { TLNuBoxTool } from '@tldraw/next'
import { NuEllipseShape, Shape, NuApp } from 'stores'

export class NuEllipseTool extends TLNuBoxTool<NuEllipseShape, Shape, NuApp> {
  static id = 'ellipse'
  static shortcut = 'c,3'
  shapeClass = NuEllipseShape
}
