import { TLNuApp } from '@tldraw/next'
import { NuBoxShape, NuPenShape, NuPolygonShape, NuEllipseShape, Shape } from './shapes'
import { NuDrawTool, NuPolygonTool, NuBoxTool, NuEllipseTool } from './tools'

export class NuApp extends TLNuApp<Shape> {
  constructor() {
    super()
    this.registerShapes(NuBoxShape, NuEllipseShape, NuPolygonShape, NuPenShape)
    this.registerTools(NuBoxTool, NuEllipseTool, NuPolygonTool, NuDrawTool)
    this.selectTool('select')
  }
}
