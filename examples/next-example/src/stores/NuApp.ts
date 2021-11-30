/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLNuApp, TLNuSelectTool, TLNuTool } from '@tldraw/next'
import type { Shape } from './shapes'
import { NuBoxTool, NuEllipseTool } from './tools'

export class NuApp extends TLNuApp<Shape> {
  constructor() {
    super()
    this.registerToolShortcuts()
    this.selectTool('select')
  }

  tools: TLNuTool<Shape>[] = [
    new TLNuSelectTool(this),
    new NuBoxTool(this),
    new NuEllipseTool(this),
  ]
}
