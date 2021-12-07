/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLNuBoxTool } from '@tldraw/next'
import { NuPolygonShape } from 'stores'

export class NuPolygonTool extends TLNuBoxTool<NuPolygonShape> {
  static id = 'polygon'
  shapeClass = NuPolygonShape
  shortcut = 'g,4'
  label = 'Polygon'
}
