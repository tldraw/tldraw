import { TLNuBoxTool } from '@tldraw/next'
import { NuPolygonShape } from 'stores'

export class NuPolygonTool extends TLNuBoxTool<NuPolygonShape> {
  static id = 'polygon'
  static shortcut = 'g,4'
  shapeClass = NuPolygonShape
}
