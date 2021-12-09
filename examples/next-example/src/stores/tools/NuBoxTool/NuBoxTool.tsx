import { TLNuBoxTool } from '@tldraw/next'
import { NuApp, NuBoxShape } from 'stores'

export class NuBoxTool extends TLNuBoxTool<NuBoxShape, NuApp> {
  static id = 'box'
  static shortcut = 'b,r,2'
  shapeClass = NuBoxShape
}
