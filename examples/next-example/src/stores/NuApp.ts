import { TLNuApp, TLNuBinding } from '@tldraw/next'
import {
  NuBoxShape,
  NuDotShape,
  NuPenShape,
  NuPolygonShape,
  NuEllipseShape,
  NuHighlighterShape,
  Shape,
} from './shapes'
import {
  NuDotTool,
  NuPenTool,
  NuPolygonTool,
  NuBoxTool,
  NuEllipseTool,
  NuHighlighterTool,
} from './tools'

export class NuApp extends TLNuApp<Shape, TLNuBinding> {
  constructor() {
    super()
    this.registerShapes(
      NuBoxShape,
      NuEllipseShape,
      NuPolygonShape,
      NuPenShape,
      NuHighlighterShape,
      NuDotShape
    )
    this.registerTools(
      NuBoxTool,
      NuEllipseTool,
      NuPolygonTool,
      NuPenTool,
      NuHighlighterTool,
      NuDotTool
    )
    this.selectTool('select')
  }
}
