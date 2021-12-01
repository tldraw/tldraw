import { TLNuApp } from '@tldraw/next'
import { NuBoxShape, NuEllipseShape, Shape } from './shapes'
import { NuBoxTool, NuEllipseTool } from './tools'

export class NuApp extends TLNuApp<Shape> {
  constructor() {
    super()
    this.registerShapes(NuBoxShape, NuEllipseShape)
    this.registerTools(NuBoxTool, NuEllipseTool)
    this.selectTool('select')
  }
}
