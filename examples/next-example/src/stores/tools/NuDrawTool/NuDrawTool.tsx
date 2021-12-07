import { TLNuDrawTool } from '@tldraw/next'
import { NuPenShape } from 'stores'

export class NuDrawTool extends TLNuDrawTool<NuPenShape> {
  static id = 'draw'
  shortcut = 'd,p,5'
  shapeClass = NuPenShape
  label = 'Draw'

  simplify = false
}
