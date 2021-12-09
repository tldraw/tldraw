import { TLNuDotTool } from '@tldraw/next'
import { NuApp, NuDotShape } from 'stores'

export class NuDotTool extends TLNuDotTool<NuDotShape, NuApp> {
  static id = 'dot'
  static shortcut = 't,r,6'
  shapeClass = NuDotShape
}
