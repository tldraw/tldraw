import { TLNuDrawTool } from '@tldraw/next'
import { NuHighlighterShape } from 'stores'

export class NuHighlighterTool extends TLNuDrawTool<NuHighlighterShape> {
  static id = 'highlighter'
  shortcut = 'h'
  shapeClass = NuHighlighterShape
  label = 'Highlighter'
}
