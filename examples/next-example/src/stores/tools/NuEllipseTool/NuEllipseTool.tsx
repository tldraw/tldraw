import { TLNuBoxTool } from '@tldraw/next'
import { NuEllipseShape } from 'stores'

export class NuEllipseTool extends TLNuBoxTool<NuEllipseShape> {
  static id = 'ellipse'
  static shortcut = 'c,3'
  shapeClass = NuEllipseShape
}
