import { TLNuDrawTool } from '@tldraw/next'
import { NuHighlighterShape, Shape, NuApp } from 'stores'

export class NuHighlighterTool extends TLNuDrawTool<NuHighlighterShape, Shape, NuApp> {
  static id = 'highlighter'
  static shortcut = 'h'
  shapeClass = NuHighlighterShape
  simplify = true
  simplifyTolerance = 0.618
}
