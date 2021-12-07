import { TLNuDrawTool } from '@tldraw/next'
import { NuPenShape } from 'stores'

export class NuDrawTool extends TLNuDrawTool<NuPenShape> {
  static id = 'draw'
  static shortcut = 'd,p,5'
  shapeClass = NuPenShape
  simplify = false
}
