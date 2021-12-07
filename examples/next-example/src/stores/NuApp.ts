import { TLNuApp } from '@tldraw/next'
import {
  NuBoxShape,
  NuPenShape,
  NuPolygonShape,
  NuEllipseShape,
  NuHighlighterShape,
  Shape,
} from './shapes'
import { NuDrawTool, NuPolygonTool, NuBoxTool, NuEllipseTool, NuHighlighterTool } from './tools'

export class NuApp extends TLNuApp<Shape> {
  constructor() {
    super()
    this.registerShapes(NuBoxShape, NuEllipseShape, NuPolygonShape, NuPenShape, NuHighlighterShape)
    this.registerTools(NuBoxTool, NuEllipseTool, NuPolygonTool, NuDrawTool, NuHighlighterTool)
    this.selectTool('select')
  }
}
