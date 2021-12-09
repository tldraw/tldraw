import { TLNuBoxTool } from '@tldraw/next'
import { NuStarShape, Shape, NuApp } from 'stores'

export class NuStarTool extends TLNuBoxTool<NuStarShape, Shape, NuApp> {
  static id = 'star'
  shapeClass = NuStarShape
}
