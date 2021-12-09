import { TLNuBoxTool } from '@tldraw/next'
import { Shape, NuApp, NuBoxShape } from 'stores'

export class NuBoxTool extends TLNuBoxTool<NuBoxShape, Shape, NuApp> {
  static id = 'box'
  static shortcut = 'b,r,2'
  shapeClass = NuBoxShape
}
