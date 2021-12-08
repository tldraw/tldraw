/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLNuBinding, TLNuBoxTool } from '@tldraw/next'
import { NuApp, NuBoxShape } from 'stores'

export class NuBoxTool extends TLNuBoxTool<NuBoxShape, TLNuBinding, NuApp> {
  static id = 'box'
  static shortcut = 'b,r,2'
  shapeClass = NuBoxShape
}
