import { TLNuDotTool } from '@tldraw/next'
import { NuApp, Shape, NuDotShape } from 'stores'

export class NuDotTool extends TLNuDotTool<NuDotShape, Shape, NuApp> {
  static id = 'dot'
  static shortcut = 't,r,6'
  shapeClass = NuDotShape
}
