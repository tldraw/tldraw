/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLNuBinding, TLNuBoxTool } from '@tldraw/next'
import { NuBoxShape } from 'stores'

export class NuBoxTool extends TLNuBoxTool<NuBoxShape, TLNuBinding> {
  static id = 'box'
  shortcut = 'b,r,2'
  shapeClass = NuBoxShape
  label = 'Box'
}
