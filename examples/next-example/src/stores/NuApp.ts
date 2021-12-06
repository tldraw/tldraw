import { TLNuApp } from '@tldraw/next'
import { NuBoxShape, NuDrawShape, NuPolygonShape, NuEllipseShape, Shape } from './shapes'
import { NuDrawTool, NuPolygonTool, NuBoxTool, NuEllipseTool } from './tools'

export class NuApp extends TLNuApp<Shape> {
  constructor() {
    super()
    this.registerShapes(NuBoxShape, NuEllipseShape, NuPolygonShape, NuDrawShape)
    this.registerTools(NuBoxTool, NuEllipseTool, NuPolygonTool, NuDrawTool)
    this.selectTool('select')
  }
}
