/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLNuBinding, TLNuDotTool } from '@tldraw/next'
import { NuApp, NuDotShape } from 'stores'

export class NuDotTool extends TLNuDotTool<NuDotShape, TLNuBinding, NuApp> {
  static id = 'dot'
  static shortcut = 't,r,6'
  shapeClass = NuDotShape
}
