import { TLNuDrawTool } from '@tldraw/next'
import { NuHighlighterShape } from 'stores'

export class NuHighlighterTool extends TLNuDrawTool<NuHighlighterShape> {
  static id = 'highlighter'
  static shortcut = 'h'
  shapeClass = NuHighlighterShape
  simplify = true
  simplifyTolerance = 0.618
}
