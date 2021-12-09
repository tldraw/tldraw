import { TLNuBoxTool } from '@tldraw/next'
import { NuPolygonShape, Shape, NuApp } from 'stores'

export class NuPolygonTool extends TLNuBoxTool<NuPolygonShape, Shape, NuApp> {
  static id = 'polygon'
  static shortcut = 'g,4'
  shapeClass = NuPolygonShape
}
